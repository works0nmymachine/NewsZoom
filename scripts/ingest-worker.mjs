// Ingest-worker: haalt de bronnen uit data/feeds.json periodiek op en bewaart nieuwe of gewijzigde
// berichten in nz_feeditems. Houdt per bron de laatste (geslaagde) controle bij. Haalt ook koersen op.
// Voert ook aangevraagde achtergronddossiers uit (nz_achtergronden), binnen het maandbudget.
// Gebruik: node scripts/ingest-worker.mjs [--once]
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { parseFeed } from './feed-parser.mjs';
import { haalAlles } from './koersen-ophalen.mjs';
import { maakAchtergrond } from './achtergrond.mjs';
import { veiligOphalen } from './veilig-ophalen.mjs';
import { slaItemsOp } from './feed-opslaan.mjs';

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
      `INSERT INTO nz_feedbronnen (id, naam, homepage, feed_url, soort, reikwijdte, gebied, onderwerpen, actief)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       ON CONFLICT (id) DO UPDATE SET naam = $2, homepage = $3, feed_url = $4, soort = $5, reikwijdte = $6,
         gebied = $7, onderwerpen = $8, actief = true`,
      [b.id, b.naam, b.homepage, b.feed, b.soort, b.reikwijdte, b.gebied ?? null, b.onderwerpen ?? []],
    );
  }
  // Alleen bronnen uit het bestand uitzetten; bronnen die gebruikers toevoegden blijven staan.
  await db.query(`UPDATE nz_feedbronnen SET actief = false WHERE herkomst = 'bestand' AND NOT (id = ANY($1))`, [bronnen.map((b) => b.id)]);
}

async function haalBron(b) {
  const kop = { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5' };
  if (b.etag) kop['if-none-match'] = b.etag;
  if (b.last_modified) kop['if-modified-since'] = b.last_modified;
  try {
    // Bronnen van gebruikers via de SSRF-veilige ophaler; de vaste bronnen uit het bestand via fetch.
    const r = b.herkomst === 'gebruiker'
      ? await veiligOphalen(b.feed_url, { headers: kop, timeoutMs: 20000 }).then((x) => ({
          status: x.status, ok: x.status >= 200 && x.status < 300, text: async () => x.body, headers: { get: (k) => x.headers[k] ?? null },
        }))
      : await fetch(b.feed_url, { headers: kop, signal: AbortSignal.timeout(20000), redirect: 'follow' });
    if (r.status === 304) {
      await db.query(`UPDATE nz_feedbronnen SET laatste_controle = now(), laatste_succes = now(), laatste_fout = NULL WHERE id = $1`, [b.id]);
      return { nieuw: 0, ongewijzigd: true };
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const tekst = await r.text();
    if (tekst.length > 5_000_000) throw new Error('Feed te groot');
    const items = parseFeed(tekst);
    const nieuw = await slaItemsOp(db, b.id, items);
    await db.query(
      `UPDATE nz_feedbronnen SET laatste_controle = now(), laatste_succes = now(), laatste_fout = NULL, etag = $2, last_modified = $3 WHERE id = $1`,
      [b.id, r.headers.get('etag'), r.headers.get('last-modified')],
    );
    return { nieuw, totaal: items.length };
  } catch (e) {
    const fout = String(e?.name === 'TimeoutError' ? 'time-out' : e?.message ?? e).slice(0, 200);
    await db.query(`UPDATE nz_feedbronnen SET laatste_controle = now(), laatste_fout = $2 WHERE id = $1`, [b.id, fout]);
    return { fout };
  }
}

async function rondeFeeds() {
  await bronnenBijwerken();
  const { rows } = await db.query(`SELECT * FROM nz_feedbronnen WHERE actief AND NOT gepauzeerd ORDER BY laatste_controle NULLS FIRST`);
  for (const b of rows) log(b.id, JSON.stringify(await haalBron(b)));
  await db.query(`DELETE FROM nz_feeditems WHERE gepubliceerd < now() - make_interval(days => $1)`, [BEWAAR_DAGEN]);
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

// Achtergrond op aanvraag: één opdracht tegelijk; een vastgelopen opdracht gaat na 20 minuten terug in de rij.
async function volgendeAchtergrond() {
  await db.query(`UPDATE nz_achtergronden SET status = 'wachtend', gestart_at = NULL
                   WHERE status = 'bezig' AND gestart_at < now() - interval '20 minutes'`);
  const { rows } = await db.query(
    `UPDATE nz_achtergronden SET status = 'bezig', gestart_at = now(), fout = NULL
     WHERE sleutel = (SELECT sleutel FROM nz_achtergronden WHERE status = 'wachtend' ORDER BY aangevraagd_at LIMIT 1 FOR UPDATE SKIP LOCKED)
     RETURNING sleutel, invoer`,
  );
  const opdracht = rows[0];
  if (!opdracht) return false;
  log('achtergrond', opdracht.sleutel, 'gestart');
  try {
    const { vraagOpenAI } = await import('./llm/openai.mjs');
    const { vraagAnthropic } = await import('./llm/anthropic.mjs');
    const vandaag = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(new Date());
    const r = await maakAchtergrond(db, opdracht, { aanroepen: { openai: vraagOpenAI, anthropic: vraagAnthropic }, vandaag });
    await db.query(
      `UPDATE nz_achtergronden SET status = 'klaar', inhoud = $2, provider = $3, model = $4, kosten_usd = $5, klaar_at = now() WHERE sleutel = $1`,
      [opdracht.sleutel, r.inhoud, r.provider, r.model, r.kosten_usd],
    );
    log('achtergrond', opdracht.sleutel, 'klaar', r.provider, r.model, `$${r.kosten_usd}`);
  } catch (e) {
    const fout = String(e?.message ?? e).slice(0, 500);
    await db.query(`UPDATE nz_achtergronden SET status = 'mislukt', fout = $2, klaar_at = now() WHERE sleutel = $1`, [opdracht.sleutel, fout]);
    log('achtergrond', opdracht.sleutel, 'MISLUKT', fout);
  }
  return true;
}

const veilig = (naam, fn) => fn().catch((e) => log(naam, 'MISLUKT', e?.message ?? e));

let gestopt = false;
for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => { gestopt = true; });

async function lusAchtergronden() {
  while (!gestopt) {
    const gedaan = await volgendeAchtergrond().catch((e) => { log('achtergrond', 'MISLUKT', e?.message ?? e); return false; });
    if (!gedaan) await new Promise((r) => setTimeout(r, 5000));
  }
}
const achtergronden = eenmalig ? Promise.resolve() : lusAchtergronden();

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
await achtergronden;
await db.end();
