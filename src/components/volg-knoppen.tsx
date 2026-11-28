'use client';

import { useOptimistic, useTransition } from 'react';
import type { Actie } from '@/lib/filters';
import { Icoon } from './iconen';
import { useRegel } from './kaart-menu';

/** Volg dit verhaal / Verberg dit verhaal, zonder paginasprong en met Ongedaan maken. */
export function VolgKnoppen({ id, naam, huidig }: { id: string; naam: string; huidig: Actie | null }) {
  const [bezig, start] = useTransition();
  const [stand, zet] = useOptimistic(huidig);
  const wijzig = useRegel();
  const kies = (a: Actie) => start(async () => {
    const nieuw = stand === a ? 'wissen' : a;
    zet(nieuw === 'wissen' ? null : nieuw);
    await wijzig('verhaal', id, naam, nieuw);
  });
  return (
    <div className="verhaal-acties">
      <button type="button" className={`knop knop-klein${stand === 'meer' ? '' : ' knop-hoofd'}`} aria-pressed={stand === 'meer'} disabled={bezig} onClick={() => kies('meer')}>
        {stand === 'meer' ? <><Icoon naam="check" grootte={16} />Je volgt dit verhaal</> : <><Icoon naam="plus" grootte={16} />Volg dit verhaal</>}
      </button>
      <button type="button" className="knop knop-klein knop-zacht" aria-pressed={stand === 'verbergen'} disabled={bezig} onClick={() => kies('verbergen')}>
        <Icoon naam="verbergen" grootte={16} />{stand === 'verbergen' ? 'Verborgen · niet meer verbergen' : 'Verberg dit verhaal'}
      </button>
    </div>
  );
}
