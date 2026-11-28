'use client';

import { useRouter } from 'next/navigation';
import { Icoon } from './iconen';

/** Terug naar het vorige scherm in de app; zonder geschiedenis naar de standaardpagina. */
export function TerugKnop({ standaard }: { standaard: string }) {
  const router = useRouter();
  return (
    <a href={standaard} className="icoonknop terug" aria-label="Terug" onClick={(e) => {
      if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) {
        e.preventDefault();
        router.back();
      }
    }}>
      <Icoon naam="terug" />
    </a>
  );
}
