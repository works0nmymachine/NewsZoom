import pg from 'pg';

export const dynamic = 'force-dynamic';

// Gebruikt door de deployworkflow: status, commit en een databasecheck, zonder persoonsgegevens.
export async function GET() {
  const commit = process.env.APP_COMMIT ?? 'development';
  const headers = { 'Cache-Control': 'no-store' };
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 2000,
    query_timeout: 2000,
    statement_timeout: 2000,
  });
  try {
    if (!process.env.DATABASE_URL) throw new Error('Database niet ingesteld');
    await client.connect();
    await client.query('SELECT 1 FROM nz_migraties LIMIT 1');
    return Response.json({ status: 'ok', commit }, { headers });
  } catch {
    return Response.json({ status: 'unavailable', commit }, { status: 503, headers });
  } finally {
    await client.end().catch(() => {});
  }
}
