import pg from 'pg';

const globalForPool = globalThis as unknown as { nzPool?: pg.Pool };

export function pool(): pg.Pool {
  if (!globalForPool.nzPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL ontbreekt');
    globalForPool.nzPool = new pg.Pool({ connectionString, max: 10, connectionTimeoutMillis: 4000 });
  }
  return globalForPool.nzPool;
}
