'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { MENU } from './hoofd-menu';
import { Icoon, type IcoonNaam } from './iconen';

const TABS: { href: string; naam: string; icoon: IcoonNaam }[] = [
  { href: '/', naam: 'Vandaag', icoon: 'vandaag' },
  { href: '/mijn-nieuws', naam: 'Mijn Nieuws', icoon: 'ster' },
  { href: '/ontdekken', naam: 'Ontdekken', icoon: 'kompas' },
  { href: '/finance', naam: 'Finance', icoon: 'grafiek' },
  { href: '/agenda', naam: 'Agenda', icoon: 'kalender' },
];

const SLEUTEL = 'nz-tabs';
const tabVan = (pad: string) => TABS.find((t) => (t.href === '/' ? pad === '/' : pad.startsWith(t.href)));

const OPSLAG_EVENT = 'nz-tabs';
function ruw(): string {
  try { return sessionStorage.getItem(SLEUTEL) ?? '{}'; } catch { return '{}'; }
}
function abonneer(melden: () => void) {
  window.addEventListener(OPSLAG_EVENT, melden);
  return () => window.removeEventListener(OPSLAG_EVENT, melden);
}
function lees(tekst: string): Record<string, string> {
  try { return JSON.parse(tekst); } catch { return {}; }
}

/**
 * Hoofdnavigatie: onderin op de telefoon, links als zijbalk vanaf 768 px.
 * Elke tab onthoudt zijn laatste scherm (deze sessie); een tik op de actieve tab gaat naar het begin van die tab.
 */
export function Nav() {
  const pad = usePathname();
  const router = useRouter();
  const zoek = useSearchParams().toString();
  const opgeslagen = useSyncExternalStore(abonneer, ruw, () => '{}');
  const laatste = useMemo(() => lees(opgeslagen), [opgeslagen]);

  useEffect(() => {
    const tab = tabVan(pad);
    if (!tab) return;
    const nieuw = { ...lees(ruw()), [tab.href]: `${pad}${zoek ? `?${zoek}` : ''}` };
    try { sessionStorage.setItem(SLEUTEL, JSON.stringify(nieuw)); } catch { /* geen opslag: geen geheugen */ }
    window.dispatchEvent(new Event(OPSLAG_EVENT));
  }, [pad, zoek]);

  const actief = tabVan(pad);
  return (
    <nav className="tabbalk" aria-label="Hoofdnavigatie">
      <Link href="/" className="zijbalk-merk">NewsZoom</Link>
      {TABS.map((t) => {
        const isActief = actief?.href === t.href;
        const doel = !isActief && laatste[t.href] ? laatste[t.href] : t.href;
        return (
          <Link key={t.href} href={doel} className="tab" aria-current={isActief ? 'page' : undefined} onClick={(e) => {
            if (!isActief) return;
            e.preventDefault();
            if (pad === t.href && !window.location.search && window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'smooth' });
            else router.push(t.href);
          }}>
            <Icoon naam={t.icoon} grootte={22} />
            <span>{t.naam}</span>
          </Link>
        );
      })}
      <div className="zijbalk-menu">
        {MENU.map((m) => (
          <Link key={m.href} href={m.href} className="tab tab-klein" aria-current={pad.startsWith(m.href) ? 'page' : undefined}>
            <Icoon naam={m.icoon} grootte={18} /><span>{m.naam}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
