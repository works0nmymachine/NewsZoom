import 'server-only';
import { cache } from 'react';
import { pool } from './db';
import type { Finance } from './finance-agenda-types';
import { leesDataBestand } from './inhoud';
import type { Koers } from './koersmeting';

export function finance(): Finance {
  return leesDataBestand<Finance>('finance.json') ?? { bronnen: [], instrumenten: [], berichten: [] };
}

type KoersBestand = { opgehaald: string; reeksen: Record<string, { bron: string; koersen: Koers[]; fout?: string }> };

/** Dagkoersen uit de database (ingest-worker); zonder database-rijen de momentopname in data/mvp/koersen.json. */
export const koersen = cache(async (reeks: string): Promise<{ koersen: Koers[]; bron: string; bijgewerkt: string | null }> => {
  try {
    const { rows } = await pool().query(`SELECT to_char(datum, 'YYYY-MM-DD') AS datum, slot::float8 AS slot FROM nz_koersen WHERE reeks = $1 ORDER BY datum`, [reeks]);
    if (rows.length) {
      const b = await pool().query(`SELECT bron, laatste_controle FROM nz_koersbronnen WHERE reeks = $1`, [reeks]);
      return { koersen: rows, bron: b.rows[0]?.bron ?? 'onbekend', bijgewerkt: b.rows[0]?.laatste_controle?.toISOString() ?? null };
    }
  } catch { /* tabel ontbreekt: val terug op het bestand */ }
  const f = leesDataBestand<KoersBestand>('koersen.json');
  const r = f?.reeksen[reeks];
  return { koersen: r?.koersen ?? [], bron: r?.bron ?? 'onbekend', bijgewerkt: f?.opgehaald ?? null };
});

export const REEKS_VAN: Record<string, string> = { nvda: 'nvda', btc: 'btc' };
export const BENCHMARK_REEKS: Record<string, { reeks: string; naam: string }> = { nvda: { reeks: 'ndx', naam: 'Nasdaq-100' } };

export async function watchlistVan(gebruiker: string): Promise<Set<string>> {
  const { rows } = await pool().query(`SELECT instrument FROM nz_watchlist WHERE gebruiker = $1`, [gebruiker]);
  return new Set(rows.map((r) => r.instrument));
}
