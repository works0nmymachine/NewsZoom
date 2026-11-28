import 'server-only';
import { cache } from 'react';
import { pool } from './db';
import { GEBIEDEN, type Gebied } from './gebieden';

export type Instellingen = { gebied: Gebied | null; gebiedGekozen: boolean; startKlaar: boolean };

/** Persoonlijke instellingen. Zonder keuze is Amsterdam het lokale gebied (de enige proefregio). */
export const instellingenVan = cache(async (gebruiker: string): Promise<Instellingen> => {
  try {
    const { rows } = await pool().query(`SELECT gebied, start_klaar_at FROM nz_instellingen WHERE gebruiker = $1`, [gebruiker]);
    const r = rows[0];
    const gebied = r?.gebied === 'geen' ? null : GEBIEDEN.find((g) => g.id === r?.gebied) ?? GEBIEDEN[0];
    return { gebied, gebiedGekozen: !!r?.gebied, startKlaar: !!r?.start_klaar_at };
  } catch {
    return { gebied: GEBIEDEN[0], gebiedGekozen: false, startKlaar: true };
  }
});

const PAUZE_MINUTEN = 30;

/**
 * Houdt bezoeken bij. Een nieuw bezoek begint na 30 minuten zonder activiteit; vorige_at wordt dan het laatste
 * moment van het vorige bezoek. Berichten van daarna zijn "Nieuw" (null bij een eerste bezoek).
 */
export async function bezoek(gebruiker: string): Promise<Date | null> {
  try {
    const { rows } = await pool().query(
      `INSERT INTO nz_bezoeken (gebruiker, vorige_at, laatste_at) VALUES ($1, NULL, now())
       ON CONFLICT (gebruiker) DO UPDATE SET
         vorige_at = CASE WHEN nz_bezoeken.laatste_at < now() - make_interval(mins => $2) THEN nz_bezoeken.laatste_at ELSE nz_bezoeken.vorige_at END,
         laatste_at = now()
       RETURNING vorige_at`,
      [gebruiker, PAUZE_MINUTEN],
    );
    return rows[0]?.vorige_at ?? null;
  } catch {
    return null;
  }
}
