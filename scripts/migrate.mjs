import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

// Past nieuwe SQL-bestanden uit db/migrations toe, op naam gesorteerd, elk in een eigen transactie.
// Draait op de server als de beperkte rol newszoom; tabellen komen via search_path in schema newszoom.
const url = process.argv[2] ?? process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL ontbreekt');
  process.exit(1);
}

const dir = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'db', 'migrations');
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query('CREATE TABLE IF NOT EXISTS nz_migraties (naam text PRIMARY KEY, toegepast_at timestamptz NOT NULL DEFAULT now())');
  const { rows } = await client.query('SELECT naam FROM nz_migraties');
  const gedaan = new Set(rows.map((r) => r.naam));
  for (const naam of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
    if (gedaan.has(naam)) continue;
    const sql = await readFile(path.join(dir, naam), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO nz_migraties (naam) VALUES ($1)', [naam]);
      await client.query('COMMIT');
      console.log(`toegepast: ${naam}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }
  console.log('migraties bijgewerkt');
} finally {
  await client.end();
}
