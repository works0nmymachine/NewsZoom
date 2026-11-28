'use client';

import { useOptimistic, useTransition } from 'react';
import { agendaWijzigen } from '@/app/acties';
import { Icoon } from './iconen';
import { useMelding } from './meldingen';

type Soort = 'evenement' | 'categorie' | 'locatie';
type Actie = 'volgen' | 'verbergen';

function useAgenda() {
  const toon = useMelding();
  return async (soort: Soort, id: string, naam: string, actie: Actie | 'wissen') => {
    try {
      const r = await agendaWijzigen(soort, id, actie);
      const tekst = actie === 'volgen' ? `Je volgt ${naam}` : actie === 'verbergen' ? `${naam} verborgen` : `Keuze voor ${naam} gewist`;
      toon(tekst, { knop: { tekst: 'Ongedaan maken', actie: async () => { await agendaWijzigen(soort, id, r.vorige ?? 'wissen'); toon('Teruggezet'); } } });
    } catch {
      toon('Opslaan lukte niet. Probeer het opnieuw.', { fout: true });
    }
  };
}

/** Eén aan/uit-knop voor volgen of verbergen (evenement, podium of categorie). */
export function AgendaKnop({ soort, id, naam, actie, huidig, tekst, aanTekst, zacht }: {
  soort: Soort; id: string; naam: string; actie: Actie; huidig: Actie | null; tekst: string; aanTekst?: string; zacht?: boolean;
}) {
  const [bezig, start] = useTransition();
  const [stand, zet] = useOptimistic(huidig);
  const wijzig = useAgenda();
  const aan = stand === actie;
  return (
    <button type="button" className={`chip${zacht ? ' chip-zacht' : ''}`} aria-pressed={aan} disabled={bezig} onClick={() => start(async () => {
      zet(aan ? null : actie);
      await wijzig(soort, id, naam, aan ? 'wissen' : actie);
    })}>
      {actie === 'volgen' && <Icoon naam={aan ? 'check' : 'plus'} grootte={14} />}
      {aan ? aanTekst ?? tekst : tekst}
    </button>
  );
}

/** Categorie aan of uit in de agenda (uit = verbergen), als gekleurde chip met pictogram. */
export function CategorieKnop({ id, naam, icoon, aantal, verborgen }: { id: string; naam: string; icoon: string; aantal?: number; verborgen: boolean }) {
  const [bezig, start] = useTransition();
  const [uit, zet] = useOptimistic(verborgen);
  const wijzig = useAgenda();
  return (
    <button type="button" className="cat-chip" data-cat={id} aria-pressed={!uit} disabled={bezig}
      title={uit ? `${naam} weer tonen` : `${naam} verbergen`} onClick={() => start(async () => {
        zet(!uit);
        await wijzig('categorie', id, naam, uit ? 'wissen' : 'verbergen');
      })}>
      <span className="cat-icoon" aria-hidden="true">{icoon}</span>
      <span className="cat-tekst">{naam}</span>
      {aantal !== undefined && <span className="cat-aantal">{aantal}</span>}
    </button>
  );
}
