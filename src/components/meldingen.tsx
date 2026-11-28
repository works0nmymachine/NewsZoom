'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type Knop = { tekst: string; actie: () => void | Promise<void> };
type Melding = { id: number; tekst: string; knop?: Knop; fout?: boolean };
type Toon = (tekst: string, opties?: { knop?: Knop; fout?: boolean; duur?: number }) => void;

const Context = createContext<Toon>(() => {});

/** Korte meldingen onderin, met optioneel één knop zoals Ongedaan maken. Eén tegelijk. */
export function Meldingen({ children }: { children: React.ReactNode }) {
  const [melding, setMelding] = useState<Melding | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toon = useCallback<Toon>((tekst, opties = {}) => {
    if (timer.current) clearTimeout(timer.current);
    setMelding({ id: Date.now(), tekst, knop: opties.knop, fout: opties.fout });
    timer.current = setTimeout(() => setMelding(null), opties.duur ?? (opties.knop ? 7000 : 3500));
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <Context.Provider value={toon}>
      {children}
      <div className="melding-houder" role="status" aria-live="polite">
        {melding && (
          <div key={melding.id} className={`toast${melding.fout ? ' toast-fout' : ''}`}>
            <span>{melding.tekst}</span>
            {melding.knop && (
              <button type="button" className="toast-knop" onClick={async () => {
                const k = melding.knop!;
                setMelding(null);
                await k.actie();
              }}>{melding.knop.tekst}</button>
            )}
          </div>
        )}
      </div>
    </Context.Provider>
  );
}

export const useMelding = () => useContext(Context);
