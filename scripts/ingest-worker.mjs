// Ingest-worker: haalt de bronnen uit data/feeds.json periodiek op en bewaart nieuwe of gewijzigde
// berichten in nz_feeditems. Houdt per bron de laatste (geslaagde) controle bij. Haalt ook koersen op.
// Gebruik: node scripts/ingest-worker.mjs [--once]
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { negeren, parseFeed } from './feed-parser.mjs';
import { haalAlles } from './koersen-ophalen.mjs';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const MINUTEN = Number(process.env.NZ_INGEST_MINUTEN ?? 20);
const KOERS_UREN = Number(process.env.NZ_KOERS_UREN ?? 6);
const BEWAAR_DAGEN = Number(process.env.NZ_BEWAAR_DAGEN ?? 60);
const UA = process.env.NZ_USER_AGENT ?? 'Mozilla/5.0 (compatible; NewsZoom/0.1; +https://newszoom.craftstudio.work)';
const eenmalig = process.argv.includes('--once');

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const log = (...a) => console.log(new Date().toISOString(), ...a);

async function bronnenBijwerken() {
  const { bronnen } = JSON.parse(await readFile(path.join(ROOT, 'data', 'feeds.json'), 'utf8'));
  for (const b of bronnen) {
    await db.query(
      `INSERT INTO nz_feedbronnen (id, naam, homepage, feed_url, soort, reikwijdte, gebied, onderwerpen, taal, uitgever, actief)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
       ON CONFLICT (id) DO UPDATE SET naam = $2, homepage = $3, feed_url = $4, soort = $5, reikwijdte = $6,
         gebied = $7, onderwerpen = $8, taal = $9, uitgever = $10, actief = true`,
      [b.id, b.naam, b.homepage, b.feed, b.soort, b.reikwijdte, b.gebied ?? null, b.onderwerpen ?? [], b.taal ?? 'nl', b.uitgever ?? null],
    );
  }
  await db.query(`UPDATE nz_feedbronnen SET actief = false WHERE NOT (id = ANY($1))`, [bronnen.map((b) => b.id)]);
  return new Map(bronnen.map((b) => [b.id, b]));
}

async function haalBron(b, config) {
  const kop = { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5' };
  if (b.etag) kop['if-none-match'] = b.etag;
  if (b.last_modified) kop['if-modified-since'] = b.last_modified;
  try {
    const r = await fetch(b.feed_url, { headers: kop, signal: AbortSignal.timeout(20000), redirect: 'follow' });
    if (r.status === 304) {
      await db.query(`UPDATE nz_feedbronnen SET laatste_controle = now(), laatste_succes = now(), laatste_fout = NULL WHERE id = $1`, [b.id]);
      return { nieuw: 0, ongewijzigd: true };
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const tekst = await r.text();
    if (tekst.length > 5_000_000) throw new Error('Feed te groot');
    const items = parseFeed(tekst).filter((i) => !negeren(i, config?.negeer));
    let nieuw = 0;
    for (const i of items) {
      // Nieuw: invoegen. Bekend en ongewijzigd: overslaan. Gewijzigde titel, samenvatting of afbeelding: bijwerken.
      const res = await db.query(
        `INSERT INTO nz_feeditems (bron, guid, url, titel, samenvatting, gepubliceerd, afbeelding, categorieen)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (bron, guid) DO UPDATE SET titel = EXCLUDED.titel, samenvatting = EXCLUDED.samenvatting,
           url = EXCLUDED.url, afbeelding = EXCLUDED.afbeelding, categorieen = EXCLUDED.categorieen, gewijzigd_at = now()
         WHERE nz_feeditems.titel IS DISTINCT FROM EXCLUDED.titel OR nz_feeditems.samenvatting IS DISTINCT FROM EXCLUDED.samenvatting
           OR nz_feeditems.afbeelding IS DISTINCT FROM EXCLUDED.afbeelding OR nz_feeditems.categorieen IS DISTINCT FROM EXCLUDED.categorieen
         RETURNING (xmax = 0) AS ingevoegd`,
        [b.id, i.guid.slice(0, 500), i.url.slice(0, 1000), i.titel, i.samenvatting, i.gepubliceerd, i.afbeelding, i.categorieen],
      );
      if (res.rows[0]?.ingevoegd) nieuw++;
    }
    await db.query(
      `UPDATE nz_feedbronnen SET laatste_controle = now(), laatste_succes = now(), laatste_fout = NULL, etag = $2, last_modified = $3,
         laatste_aantal = $4 WHERE id = $1`,
      [b.id, r.headers.get('etag'), r.headers.get('last-modified'), items.length],
    );
    return { nieuw, totaal: items.length };
  } catch (e) {
    const fout = String(e?.name === 'TimeoutError' ? 'time-out' : e?.message ?? e).slice(0, 200);
    await db.query(`UPDATE nz_feedbronnen SET laatste_controle = now(), laatste_fout = $2 WHERE id = $1`, [b.id, fout]);
    return { fout };
  }
}

async function rondeFeeds() {
  const config = await bronnenBijwerken();
  const ronde = await db.query(`INSERT INTO nz_ingest_rondes DEFAULT VALUES RETURNING id`);
  const { rows } = await db.query(`SELECT * FROM nz_feedbronnen WHERE actief ORDER BY laatste_controle NULLS FIRST`);
  const telling = { gelukt: 0, mislukt: 0, nieuw: 0, fouten: [] };
  for (const b of rows) {
    const uitkomst = await haalBron(b, config.get(b.id));
    log(b.id, JSON.stringify(uitkomst));
    if (uitkomst.fout) {
      telling.mislukt++;
      telling.fouten.push({ bron: b.id, fout: uitkomst.fout });
    } else {
      telling.gelukt++;
      telling.nieuw += uitkomst.nieuw;
    }
  }
  await db.query(
    `UPDATE nz_ingest_rondes SET klaar_at = now(), bronnen = $2, gelukt = $3, mislukt = $4, nieuw = $5, fouten = $6 WHERE id = $1`,
    [ronde.rows[0].id, rows.length, telling.gelukt, telling.mislukt, telling.nieuw, JSON.stringify(telling.fouten)],
  );
  await db.query(`DELETE FROM nz_feeditems WHERE gepubliceerd < now() - make_interval(days => $1)`, [BEWAAR_DAGEN]);
  await db.query(`DELETE FROM nz_ingest_rondes WHERE gestart_at < now() - interval '14 days'`);
}

async function rondeKoersen() {
  const { reeksen } = await haalAlles();
  for (const [reeks, r] of Object.entries(reeksen)) {
    for (const k of r.koersen) {
      await db.query(
        `INSERT INTO nz_koersen (reeks, datum, slot) VALUES ($1, $2, $3) ON CONFLICT (reeks, datum) DO UPDATE SET slot = EXCLUDED.slot`,
        [reeks, k.datum, k.slot],
      );
    }
    await db.query(
      `INSERT INTO nz_koersbronnen (reeks, bron, laatste_controle, laatste_fout) VALUES ($1, $2, now(), $3)
       ON CONFLICT (reeks) DO UPDATE SET bron = $2, laatste_controle = now(), laatste_fout = $3`,
      [reeks, r.bron, r.fout ?? null],
    );
    log('koersen', reeks, r.koersen.length, r.fout ?? '');
  }
}

const veilig = (naam, fn) => fn().catch((e) => log(naam, 'MISLUKT', e?.message ?? e));

let gestopt = false;
for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => { gestopt = true; });

let laatsteKoers = 0;
do {
  await veilig('feeds', rondeFeeds);
  if (Date.now() - laatsteKoers > KOERS_UREN * 3600_000) {
    await veilig('koersen', rondeKoersen);
    laatsteKoers = Date.now();
  }
  if (eenmalig) break;
  for (let s = 0; s < MINUTEN * 60 && !gestopt; s++) await new Promise((r) => setTimeout(r, 1000));
} while (!gestopt);
await db.end();
