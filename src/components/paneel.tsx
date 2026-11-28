'use client';

import { useEffect, useRef } from 'react';
import { Icoon, type IcoonNaam } from './iconen';

/** Knop die een paneel opent (onderin op de telefoon, midden op desktop). Voor filters en uitleg. */
export function Paneel({ titel, icoon, label, actief, open: openBijStart = false, children }: {
  titel: string; icoon: IcoonNaam; label: string; actief?: boolean; open?: boolean; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const buiten = (e: MouseEvent) => { if (e.target === d) d.close(); };
    d.addEventListener('click', buiten);
    if (openBijStart && !d.open) d.showModal();
    return () => d.removeEventListener('click', buiten);
  }, [openBijStart]);
  return (
    <>
      <button type="button" className="icoonknop filterknop" data-actief={actief ? 'true' : undefined} aria-label={label} aria-haspopup="dialog" onClick={() => ref.current?.showModal()}>
        <Icoon naam={icoon} />
      </button>
      <dialog ref={ref} className="paneel" aria-label={titel}>
        <div className="paneel-kop">
          <p className="paneel-titel">{titel}</p>
          <button type="button" className="icoonknop" aria-label="Sluiten" onClick={() => ref.current?.close()}><Icoon naam="sluiten" /></button>
        </div>
        <div className="paneel-inhoud">{children}</div>
      </dialog>
    </>
  );
}
