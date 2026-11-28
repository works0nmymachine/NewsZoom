import { pool } from '@/lib/db';
import { huidigeGebruiker } from '@/lib/sessie';

export const dynamic = 'force-dynamic';

/**
 * Aantal feedberichten dat na `sinds` is opgehaald, voor de knop "N nieuwe berichten". Telt alleen bronnen die de
 * gebruiker niet heeft verborgen, en met `r` alleen die reikwijdte. Een benadering: onderwerp- en verhaalregels tellen niet mee.
 */
export async function GET(request: Request) {
  const g = await huidigeGebruiker();
  if (!g) return Response.json({ fout: 'niet ingelogd' }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const sinds = params.get('sinds');
  const r = ['nederland', 'wereld', 'lokaal'].includes(params.get('r') ?? '') ? params.get('r') : null;
  const d = sinds ? new Date(sinds) : null;
  const geldig = d && !Number.isNaN(d.getTime());
  try {
    const { rows } = await pool().query(
      `SELECT now() AS nu, count(DISTINCT coalesce(b.uitgever, b.id) || '|' || lower(i.titel)) FILTER (
         WHERE $1::timestamptz IS NOT NULL AND i.opgehaald_at > $1::timestamptz AND i.gepubliceerd > now() - interval '1 day'
           AND ($3::text IS NULL OR b.reikwijdte = $3)
           AND NOT EXISTS (SELECT 1 FROM nz_filterregels f WHERE f.gebruiker = $2 AND f.doel_soort = 'bron' AND f.doel_id = b.id AND f.actie = 'verbergen')
       ) AS aantal
       FROM nz_feeditems i JOIN nz_feedbronnen b ON b.id = i.bron AND b.actief`,
      [geldig ? d.toISOString() : null, g.id, r],
    );
    return Response.json({ nu: rows[0].nu.toISOString(), aantal: Number(rows[0].aantal) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ nu: new Date().toISOString(), aantal: 0 }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
