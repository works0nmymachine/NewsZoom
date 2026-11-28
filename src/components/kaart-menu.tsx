'use client';

import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import { regelWijzigen } from '@/app/acties';
import type { Actie, DoelSoort } from '@/lib/filters';
import { Icoon } from './iconen';
import { useMelding } from './meldingen';

/**
 * ⋯-knop die een paneel opent (onderin op de telefoon). Sluit met Escape, de sluitknop of een tik ernaast.
 * De inhoud wordt pas getoond als het paneel open is; zo blijft de HTML van een lijst met veel kaarten klein.
 */
export function KaartMenu({ titel, children, label = 'Meer opties' }: { titel: string; children: React.ReactNode; label?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, zetOpen] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const buiten = (e: MouseEvent) => { if (e.target === d) d.close(); };
    const dicht = () => zetOpen(false);
    d.addEventListener('click', buiten);
    d.addEventListener('close', dicht);
    return () => { d.removeEventListener('click', buiten); d.removeEventListener('close', dicht); };
  }, []);
  useEffect(() => { if (open && ref.current && !ref.current.open) ref.current.showModal(); }, [open]);
  return (
    <>
      <button type="button" className="icoonknop" aria-label={`${label}: ${titel}`} aria-haspopup="dialog" onClick={() => zetOpen(true)}>
        <Icoon naam="meer" />
      </button>
      <dialog ref={ref} className="paneel" aria-label={titel}>
        {open && <>
          <div className="paneel-kop">
            <p className="paneel-titel">{titel}</p>
            <button type="button" className="icoonknop" aria-label="Sluiten" onClick={() => ref.current?.close()}><Icoon naam="sluiten" /></button>
          </div>
          <div className="paneel-inhoud">{children}</div>
        </>}
      </dialog>
    </>
  );
}

export type Doel = { soort: DoelSoort; id: string; naam: string; huidig: Actie | null };

const SOORT = { verhaal: 'Verhaal', onderwerp: 'Onderwerp', bron: 'Bron' } as const;
const KNOP = { meer: 'Meer', minder: 'Minder', verbergen: 'Verbergen' } as const;

export function bevestiging(actie: Actie | 'wissen', naam: string): string {
  if (actie === 'meer') return `Meer van ${naam}`;
  if (actie === 'minder') return `Minder van ${naam}`;
  if (actie === 'verbergen') return `${naam} verborgen`;
  return `Keuze voor ${naam} gewist`;
}

/** Meer / Minder / Verbergen per doel. Geen paginasprong; melding met Ongedaan maken. */
export function RegelKnoppen({ doelen, compact = false, toonSoort = true }: { doelen: Doel[]; compact?: boolean; toonSoort?: boolean }) {
  return (
    <div className="regels">
      {doelen.map((d) => <RegelRij key={`${d.soort}:${d.id}`} doel={d} compact={compact} toonSoort={toonSoort} />)}
    </div>
  );
}

export function useRegel() {
  const toon = useMelding();
  return async (soort: DoelSoort, id: string, naam: string, actie: Actie | 'wissen') => {
    try {
      const r = await regelWijzigen(soort, id, actie);
      const ongedaan = { tekst: 'Ongedaan maken', actie: async () => { await regelWijzigen(soort, id, r.vorige ?? 'wissen'); toon('Teruggezet'); } };
      if (r.suggestie) {
        const s = r.suggestie;
        toon(`Opgeslagen. Je hebt nu ${s.aantal} verhalen over ${s.naam} verborgen of minder.`, {
          knoppen: [ongedaan, {
            tekst: `${s.naam} minder tonen`,
            actie: async () => {
              const o = await regelWijzigen('onderwerp', s.onderwerp, 'minder');
              toon(bevestiging('minder', s.naam), {
                knop: { tekst: 'Ongedaan maken', actie: async () => { await regelWijzigen('onderwerp', s.onderwerp, o.vorige ?? 'wissen'); toon('Teruggezet'); } },
              });
            },
          }],
          duur: 10000,
        });
      } else {
        toon(bevestiging(actie, naam), { knop: ongedaan });
      }
    } catch {
      toon('Opslaan lukte niet. Probeer het opnieuw.', { fout: true });
    }
  };
}

function RegelRij({ doel, compact, toonSoort }: { doel: Doel; compact: boolean; toonSoort: boolean }) {
  const [bezig, start] = useTransition();
  const [huidig, zet] = useOptimistic(doel.huidig);
  const wijzig = useRegel();
  const kies = (a: Actie) => start(async () => {
    const nieuw = huidig === a ? 'wissen' : a;
    zet(nieuw === 'wissen' ? null : nieuw);
    await wijzig(doel.soort, doel.id, doel.naam, nieuw);
  });
  return (
    <div className="regelrij" aria-busy={bezig}>
      {!compact && <span className="regelrij-doel">{toonSoort && <span className="zacht">{SOORT[doel.soort]} </span>}{doel.naam}</span>}
      <span className="segment" role="group" aria-label={`${SOORT[doel.soort]} ${doel.naam}`}>
        {(['meer', 'minder', 'verbergen'] as Actie[]).map((a) => (
          <button key={a} type="button" className="segment-knop" aria-pressed={huidig === a} onClick={() => kies(a)} disabled={bezig}>
            {KNOP[a]}
          </button>
        ))}
      </span>
    </div>
  );
}
