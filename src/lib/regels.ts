import 'server-only';
import { pool } from './db';
import type { Actie, DoelSoort, Regel } from './filters';

export const DOEL_SOORTEN: DoelSoort[] = ['verhaal', 'onderwerp', 'bron'];
export const ACTIES: Actie[] = ['meer', 'minder', 'verbergen'];

export async function regelsVan(gebruiker: string): Promise<Regel[]> {
  const { rows } = await pool().query(
    `SELECT id, doel_soort, doel_id, actie FROM nz_filterregels WHERE gebruiker = $1 ORDER BY aangemaakt_at DESC`,
    [gebruiker],
  );
  return rows.map((r) => ({ id: Number(r.id), doelSoort: r.doel_soort, doelId: r.doel_id, actie: r.actie }));
}

export async function zetRegel(gebruiker: string, doelSoort: DoelSoort, doelId: string, actie: Actie) {
  await pool().query(
    `INSERT INTO nz_filterregels (gebruiker, doel_soort, doel_id, actie) VALUES ($1, $2, $3, $4)
     ON CONFLICT (gebruiker, doel_soort, doel_id) DO UPDATE SET actie = EXCLUDED.actie, aangemaakt_at = now()`,
    [gebruiker, doelSoort, doelId, actie],
  );
}

export async function wisRegel(gebruiker: string, doelSoort: DoelSoort, doelId: string) {
  await pool().query(`DELETE FROM nz_filterregels WHERE gebruiker = $1 AND doel_soort = $2 AND doel_id = $3`, [gebruiker, doelSoort, doelId]);
}
