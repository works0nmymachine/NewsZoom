import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { pool } from './db';

export const SESSIE_COOKIE = 'nz_sessie';
const GELDIG_DAGEN = 180;

export type Gebruiker = { id: string; email: string | null };

const hash = (token: string) => createHash('sha256').update(token).digest();

/** Maakt of vindt het account bij een Supabase-gebruikers-id (null = lokale testgebruiker). */
export async function gebruikerVoor(supabaseId: string | null, email: string | null): Promise<string> {
  if (supabaseId) {
    const { rows } = await pool().query(
      `INSERT INTO nz_gebruikers (supabase_id, email) VALUES ($1, $2)
       ON CONFLICT (supabase_id) DO UPDATE SET email = EXCLUDED.email RETURNING id`,
      [supabaseId, email],
    );
    return rows[0].id;
  }
  const bestaand = await pool().query(`SELECT id FROM nz_gebruikers WHERE supabase_id IS NULL AND email = $1`, [email]);
  if (bestaand.rows[0]) return bestaand.rows[0].id;
  const { rows } = await pool().query(`INSERT INTO nz_gebruikers (email) VALUES ($1) RETURNING id`, [email]);
  return rows[0].id;
}

export async function startSessie(gebruiker: string) {
  const token = randomBytes(32).toString('base64url');
  await pool().query(
    `INSERT INTO nz_sessies (token_hash, gebruiker, verloopt_at) VALUES ($1, $2, now() + make_interval(days => $3))`,
    [hash(token), gebruiker, GELDIG_DAGEN],
  );
  (await cookies()).set(SESSIE_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: GELDIG_DAGEN * 86400,
    secure: process.env.NODE_ENV === 'production',
  });
}

export const huidigeGebruiker = cache(async (): Promise<Gebruiker | null> => {
  const token = (await cookies()).get(SESSIE_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const { rows } = await pool().query(
    `SELECT g.id, g.email FROM nz_sessies s JOIN nz_gebruikers g ON g.id = s.gebruiker
     WHERE s.token_hash = $1 AND s.verloopt_at > now()`,
    [hash(token)],
  );
  return rows[0] ?? null;
});

export async function vereisGebruiker(): Promise<Gebruiker> {
  const g = await huidigeGebruiker();
  if (!g) redirect('/inloggen');
  return g;
}

export async function stopSessie() {
  const jar = await cookies();
  const token = jar.get(SESSIE_COOKIE)?.value;
  if (token) await pool().query(`DELETE FROM nz_sessies WHERE token_hash = $1`, [hash(token)]);
  jar.delete(SESSIE_COOKIE);
}
