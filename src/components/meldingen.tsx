'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type Knop = { tekst: string; actie: () => void | Promise<void> };
type Melding = { id: number; tekst: string; knoppen: Knop[]; fout?: boolean };
type Toon = (tekst: string, opties?: { knop?: Knop; knoppen?: Knop[]; fout?: boolean; duur?: number }) => void;

const Context = createContext<Toon>(() => {});

/** Korte meldingen onderin, met optioneel knoppen zoals Ongedaan maken. Eén tegelijk. Mislukt een knop, dan volgt een foutmelding. */
export function Meldingen({ children }: { children: React.ReactNode }) {
  const [melding, setMelding] = useState<Melding | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toon = useCallback<Toon>((tekst, opties = {}) => {
    if (timer.current) clearTimeout(timer.current);
    const knoppen = opties.knoppen ?? (opties.knop ? [opties.knop] : []);
    setMelding({ id: Date.now(), tekst, knoppen, fout: opties.fout });
    timer.current = setTimeout(() => setMelding(null), opties.duur ?? (knoppen.length ? 7000 : 3500));
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <Context.Provider value={toon}>
      {children}
      <div className="melding-houder" role="status" aria-live="polite">
        {melding && (
          <div key={melding.id} className={`toast${melding.fout ? ' toast-fout' : ''}`}>
            <span>{melding.tekst}</span>
            {melding.knoppen.map((k) => (
              <button key={k.tekst} type="button" className="toast-knop" onClick={async () => {
                setMelding(null);
                try {
                  await k.actie();
                } catch {
                  toon('Dat lukte niet. Controleer je verbinding en probeer het opnieuw.', { fout: true });
                }
              }}>{k.tekst}</button>
            ))}
          </div>
        )}
      </div>
    </Context.Provider>
  );
}

export const useMelding = () => useContext(Context);
