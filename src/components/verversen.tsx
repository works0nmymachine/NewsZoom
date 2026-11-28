'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Icoon } from './iconen';

const NIEUWS = ['/', '/ontdekken', '/mijn-nieuws'];
const ELKE = 2 * 60_000; // nieuwe berichten tellen
const NA_AFWEZIG = 10 * 60_000; // automatisch verversen na zo lang weg
const DREMPEL = 72; // px trekken voor verversen

/**
 * Houdt het nieuws vers zonder de lijst onder je duim te verschuiven:
 * - telt nieuw opgehaalde berichten en toont dan "N nieuwe berichten · Vernieuwen";
 * - ververst vanzelf als je na 10 minuten terugkomt in de app;
 * - trek-om-te-verversen bovenaan de pagina (telefoon).
 */
export function Verversen() {
  const router = useRouter();
  const pad = usePathname();
  const nieuwsPagina = NIEUWS.includes(pad);
  const zoekParams = useSearchParams();
  const r = pad === '/ontdekken' ? zoekParams.get('r') : null;
  const [teller, zetTeller] = useState({ pad: '', n: 0 });
  const aantal = teller.pad === pad ? teller.n : 0;
  const [bezig, start] = useTransition();
  const [trek, zetTrek] = useState(0);
  const basis = useRef<string | null>(null);
  const weg = useRef<number | null>(null);

  const telRef = useRef<() => Promise<void>>(async () => {});
  const ververs = useCallback((naarBoven = false) => {
    start(async () => {
      const min = new Promise((klaar) => setTimeout(klaar, 450));
      basis.current = null;
      router.refresh();
      await min;
      zetTeller({ pad, n: 0 });
      await telRef.current(); // nieuw beginpunt direct na het verversen, zodat er niets tussendoor valt
      if (naarBoven) window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, [router, pad]);

  const tel = useCallback(async () => {
    if (document.visibilityState !== 'visible') return;
    try {
      const zoek = new URLSearchParams();
      if (basis.current) zoek.set('sinds', basis.current);
      if (r && r !== 'alles') zoek.set('r', r);
      const antwoord = await fetch(`/api/nieuw?${zoek}`, { cache: 'no-store' });
      if (!antwoord.ok) return;
      const j = await antwoord.json();
      if (!basis.current) basis.current = j.nu;
      else zetTeller({ pad, n: j.aantal });
    } catch { /* offline: volgende keer */ }
  }, [pad, r]);

  useEffect(() => { telRef.current = tel; }, [tel]);

  useEffect(() => {
    basis.current = null;
    if (!nieuwsPagina) return;
    const eerste = setTimeout(tel, 0);
    const t = setInterval(tel, ELKE);
    return () => { clearTimeout(eerste); clearInterval(t); };
  }, [pad, nieuwsPagina, tel]);

  useEffect(() => {
    const zicht = () => {
      if (document.visibilityState === 'hidden') { weg.current = Date.now(); return; }
      if (weg.current && Date.now() - weg.current > NA_AFWEZIG) ververs();
      else if (nieuwsPagina) tel();
      weg.current = null;
    };
    document.addEventListener('visibilitychange', zicht);
    return () => document.removeEventListener('visibilitychange', zicht);
  }, [ververs, tel, nieuwsPagina]);

  // Trek-om-te-verversen: alleen als de pagina helemaal bovenaan staat en niet in een paneel.
  useEffect(() => {
    let begin: number | null = null;
    let afstand = 0;
    const neer = (e: TouchEvent) => {
      const doel = e.target as HTMLElement;
      if (window.scrollY > 0 || doel.closest('dialog, [data-geen-trek]')) { begin = null; return; }
      begin = e.touches[0].clientY;
      afstand = 0;
    };
    const beweeg = (e: TouchEvent) => {
      if (begin === null) return;
      afstand = Math.max(0, (e.touches[0].clientY - begin) * 0.45);
      zetTrek(Math.min(afstand, DREMPEL * 1.4));
    };
    const los = () => {
      if (begin !== null && afstand >= DREMPEL) ververs();
      begin = null;
      afstand = 0;
      zetTrek(0);
    };
    window.addEventListener('touchstart', neer, { passive: true });
    window.addEventListener('touchmove', beweeg, { passive: true });
    window.addEventListener('touchend', los);
    return () => {
      window.removeEventListener('touchstart', neer);
      window.removeEventListener('touchmove', beweeg);
      window.removeEventListener('touchend', los);
    };
  }, [ververs]);

  return (
    <>
      {(trek > 0 || bezig) && (
        <div className="trek" style={{ transform: `translate(-50%, ${bezig ? 12 : trek / 2}px)` }} aria-hidden="true">
          <Icoon naam="vernieuwen" className={bezig || trek >= DREMPEL ? 'draait' : undefined} grootte={18} />
        </div>
      )}
      {bezig && <span className="sr-only" role="status">Vernieuwen…</span>}
      {nieuwsPagina && aantal > 0 && !bezig && (
        <button type="button" className="nieuw-pil" onClick={() => ververs(true)}>
          <Icoon naam="omhoog" grootte={16} />{aantal} {aantal === 1 ? 'nieuw bericht' : 'nieuwe berichten'} · Vernieuwen
        </button>
      )}
    </>
  );
}
