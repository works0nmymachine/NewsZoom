'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';

const LEEFTIJD_OUD = 40; // minuten: twee keer de ophaalronde van 20 minuten

/** Tikt elke minuut; op de server is er geen klok (null), zodat de eerste weergave niet verschilt. */
function abonneer(melden: () => void) {
  const t = setInterval(melden, 30_000);
  return () => clearInterval(t);
}

/** "Bijgewerkt 7 min geleden", elke minuut opnieuw berekend. Oranje als het nieuws ouder is dan verwacht. */
export function Bijgewerkt({ iso, ok, totaal }: { iso: string | null; ok: number; totaal: number }) {
  const nu = useSyncExternalStore(abonneer, () => Math.floor(Date.now() / 60_000) * 60_000, () => null);
  if (!iso) return <Link href="/bronnen" className="bijgewerkt bijgewerkt-oud">Nog niet opgehaald</Link>;
  const min = nu === null ? null : Math.max(0, Math.round((nu - new Date(iso).getTime()) / 60000));
  const tekst = min === null ? 'Bijgewerkt' : min < 1 ? 'Zojuist bijgewerkt' : min < 60 ? `Bijgewerkt ${min} min geleden` : min < 48 * 60 ? `Bijgewerkt ${Math.floor(min / 60)} uur geleden` : 'Lang niet bijgewerkt';
  const oud = min !== null && min > LEEFTIJD_OUD;
  return (
    <Link href="/bronnen" className={`bijgewerkt${oud ? ' bijgewerkt-oud' : ''}`} title={`${ok} van ${totaal} bronnen werken`}>
      {tekst}{ok < totaal ? ` · ${totaal - ok} bron${totaal - ok === 1 ? '' : 'nen'} onbereikbaar` : ''}
    </Link>
  );
}
