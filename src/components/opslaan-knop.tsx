'use client';

import { useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useMelding } from './meldingen';

/** Opslaan-knop die bezig toont en daarna "Opgeslagen" meldt. */
export function OpslaanKnop({ tekst = 'Opslaan', melding = 'Opgeslagen' }: { tekst?: string; melding?: string }) {
  const { pending } = useFormStatus();
  const toon = useMelding();
  const was = useRef(false);
  useEffect(() => {
    if (was.current && !pending) toon(melding);
    was.current = pending;
  }, [pending, toon, melding]);
  return <button className="knop knop-klein" disabled={pending}>{pending ? 'Bezig…' : tekst}</button>;
}
