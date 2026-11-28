import { pool } from '@/lib/db';
import { huidigeGebruiker } from '@/lib/sessie';

export const dynamic = 'force-dynamic';

/** Aantal feedberichten dat na `sinds` is opgehaald. Voor de knop "N nieuwe berichten". */
export async function GET(request: Request) {
  if (!(await huidigeGebruiker())) return Response.json({ fout: 'niet ingelogd' }, { status: 401 });
  const sinds = new URL(request.url).searchParams.get('sinds');
  const d = sinds ? new Date(sinds) : null;
  const geldig = d && !Number.isNaN(d.getTime());
  try {
    const { rows } = await pool().query(
      `SELECT now() AS nu, count(*) FILTER (WHERE $1::timestamptz IS NOT NULL AND i.opgehaald_at > $1::timestamptz
         AND i.gepubliceerd > now() - interval '1 day') AS aantal
       FROM nz_feeditems i JOIN nz_feedbronnen b ON b.id = i.bron AND b.actief`,
      [geldig ? d.toISOString() : null],
    );
    return Response.json({ nu: rows[0].nu.toISOString(), aantal: Number(rows[0].aantal) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ nu: new Date().toISOString(), aantal: 0 }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
