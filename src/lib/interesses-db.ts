import 'server-only';
import { pool } from './db';
import type { Interesse } from './interesses';

export async function interessesVan(gebruiker: string): Promise<Interesse[]> {
  const { rows } = await pool().query(
    `SELECT id, naam, zoektermen, uitsluitingen, gedempt FROM nz_interesses WHERE gebruiker = $1 ORDER BY aangemaakt_at`,
    [gebruiker],
  );
  return rows.map((r) => ({ ...r, id: Number(r.id) }));
}
