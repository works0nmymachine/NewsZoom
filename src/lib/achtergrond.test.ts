import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bouwPrompt, controleer, kiesProvider, leesJson, maakAchtergrond } from '../../scripts/achtergrond.mjs';
import { besteedDezeMaand, BudgetOp, reserveer } from '../../scripts/llm/budget.mjs';
import { kosten, maandVan, prijslijst, schatting } from '../../scripts/llm/prijzen.mjs';

const laag = (url: string) => ({ tekst: 'Tekst.', bronnen: [{ titel: 'Kop', url, bron: 'NOS', datum: '2026-11-20' }] });
const dossier = (url = 'https://nos.nl/a') => ({ kort: laag(url), dezeWeek: laag(url), afgelopenMaanden: laag(url), vanafBegin: laag(url) });

describe('prijzen', () => {
  it('rekent tokens en zoekopdrachten', () => {
    // 1M invoer à $2 + 100k uitvoer à $10 + 5 zoekopdrachten à $0,01
    expect(kosten({ provider: 'openai', model: 'gpt-6.2-sol', invoer: 1_000_000, uitvoer: 100_000, zoekopdrachten: 5 })).toBeCloseTo(3.05, 6);
    expect(kosten({ provider: 'anthropic', model: 'claude-opus-5-5', invoer: 0, cache_lees: 1_000_000 })).toBeCloseTo(0.2, 6);
  });
  it('rekent een onbekend model als het duurste', () => {
    expect(kosten({ provider: 'openai', model: 'bestaat-niet', uitvoer: 1_000_000 })).toBe(40);
  });
  it('schatting is ruim', () => {
    const s = schatting({ provider: 'anthropic', model: 'claude-opus-5-5', promptTekens: 7000, maxUitvoer: 12000, maxZoek: 8 });
    expect(s).toBeGreaterThan(0.4);
    expect(s).toBeLessThan(1);
  });
  it('prijzen overschrijven via NZ_LLM_PRIJZEN', () => {
    const l = prijslijst({ NZ_LLM_PRIJZEN: JSON.stringify({ openai: { modellen: { nieuw: { invoer: 1, uitvoer: 2, cache_lees: 0, cache_schrijf: 1 } } } }) });
    expect(l.openai.modellen.nieuw.uitvoer).toBe(2);
    expect(l.openai.modellen['gpt-6.2-sol']).toBeDefined();
    expect(prijslijst({ NZ_LLM_PRIJZEN: '{kapot' }).openai.modellen['gpt-6.2-sol']).toBeDefined();
  });
  it('maand in Amsterdamse tijd', () => {
    expect(maandVan(new Date('2026-11-30T23:30:00Z'))).toBe('2026-12');
    expect(maandVan(new Date('2026-11-30T22:30:00Z'))).toBe('2026-11');
  });
});

describe('generator', () => {
  it('bouwt een prompt met de bekende berichten', () => {
    const p = bouwPrompt({ soort: 'verhaal', titel: 'ASML', laatsteOntwikkeling: 'Nieuw', berichten: [{ datum: '2026-11-27', bron: 'NOS', titel: 'Kop', url: 'https://nos.nl/a', samenvatting: '' }] }, '2026-11-28');
    expect(p).toContain('Vandaag is het 2026-11-28');
    expect(p).toContain('https://nos.nl/a');
  });
  it('leest het laatste JSON-object, ook met tekst ervoor en een codeblok', () => {
    const t = 'Ik zocht {niet dit}.\n```json\n' + JSON.stringify({ titel: 'X', dossier: dossier() }) + '\n```';
    expect(leesJson(t).titel).toBe('X');
    expect(() => leesJson('geen json')).toThrow();
  });
  it('houdt alleen gevonden links over', () => {
    const ruw = { titel: 'X', laatsteOntwikkeling: 'Y', partijen: [{ naam: 'A', belang: 'b' }], dossier: { ...dossier(), kort: { tekst: 'K', bronnen: [
      { titel: 'goed', url: 'https://nos.nl/a#x', bron: 'NOS', datum: '2026-11-20' },
      { titel: 'verzonnen', url: 'https://verzonnen.nl/b', bron: 'V', datum: 'gisteren' },
      { titel: 'http', url: 'http://nos.nl/a', bron: 'NOS', datum: '' },
    ] } } };
    const { inhoud, weggelaten } = controleer(ruw, ['https://nos.nl/a']);
    expect(inhoud.dossier.kort.bronnen).toHaveLength(1);
    expect(inhoud.dossier.kort.bronnen[0].url).toBe('https://nos.nl/a');
    expect(weggelaten).toBe(2);
  });
  it('weigert een dossier zonder laag', () => {
    expect(() => controleer({ dossier: { kort: { tekst: 'a', bronnen: [] } } }, [])).toThrow(/dezeWeek/);
  });
});

// Databasetests: alleen als er een lokale PostgreSQL is (zoals in docs/SETUP.md).
const url = process.env.TEST_DATABASE_URL ?? 'postgresql://newszoom:newszoom@localhost/newszoom';
let db: pg.Pool | null = null;
beforeAll(async () => {
  try {
    const p = new pg.Pool({ connectionString: url, max: 3 });
    await p.query(`SELECT 1 FROM nz_llm_gebruik LIMIT 1`);
    db = p;
  } catch { db = null; }
});
afterAll(async () => { await db?.end(); });

describe('budget en uitvoering (database)', () => {
  it.runIf(process.env.NZ_TEST_DB)('database is bereikbaar', () => { expect(db).not.toBeNull(); });
  const schoon = async () => {
    await db!.query(`DELETE FROM nz_llm_gebruik WHERE doel LIKE 'test:%' OR doel LIKE 'achtergrond:test:%'`);
    await db!.query(`DELETE FROM nz_instellingen`);
  };

  it('weigert boven het budget en telt mislukt zonder kosten niet mee', async () => {
    if (!db) return;
    await schoon();
    await db.query(`INSERT INTO nz_instellingen (sleutel, waarde) VALUES ('llm_budget_usd', '1')`);
    const maand = maandVan();
    const voor = await besteedDezeMaand(db, maand);
    await db.query(`INSERT INTO nz_llm_gebruik (maand, doel, provider, model, status, geschat_usd) VALUES ($1, 'test:x', 'openai', 'm', 'mislukt', 5)`, [maand]);
    expect(await besteedDezeMaand(db, maand)).toBeCloseTo(voor, 6);
    const id = await reserveer(db, { doel: 'test:a', provider: 'openai', model: 'm', geschat: 0.6 - voor });
    expect(id).toBeTruthy();
    await expect(reserveer(db, { doel: 'test:b', provider: 'openai', model: 'm', geschat: 0.6 })).rejects.toBeInstanceOf(BudgetOp);
    await schoon();
  });

  it('kiest provider op key en instelling', async () => {
    if (!db) return;
    await schoon();
    expect(await kiesProvider(db, {})).toBeNull();
    expect(await kiesProvider(db, { OPENAI_API_KEY: 'x' })).toEqual({ provider: 'openai', model: 'gpt-6.2-sol' });
    await db.query(`INSERT INTO nz_instellingen (sleutel, waarde) VALUES ('llm_provider', '"anthropic"'), ('anthropic_model', '"claude-sonnet-5-5"')`);
    expect(await kiesProvider(db, { OPENAI_API_KEY: 'x' })).toEqual({ provider: 'openai', model: 'gpt-6.2-sol' }); // geen anthropic-key
    expect(await kiesProvider(db, { OPENAI_API_KEY: 'x', ANTHROPIC_API_KEY: 'y' })).toEqual({ provider: 'anthropic', model: 'claude-sonnet-5-5' });
    await db.query(`UPDATE nz_instellingen SET waarde = '"uit"' WHERE sleutel = 'llm_provider'`);
    expect(await kiesProvider(db, { OPENAI_API_KEY: 'x' })).toBeNull();
    await schoon();
  });

  it('voert een opdracht uit met een nep-model en boekt de kosten', async () => {
    if (!db) return;
    await schoon();
    const nep = async () => ({
      tekst: 'Klaar.\n' + JSON.stringify({ titel: 'T', laatsteOntwikkeling: 'L', partijen: [], dossier: dossier('https://gevonden.nl/x') }),
      gebruik: { invoer: 20000, cache_lees: 0, cache_schrijf: 0, uitvoer: 3000, zoekopdrachten: 4 },
      gevondenUrls: ['https://gevonden.nl/x'], model: 'gpt-6.2-sol',
    });
    const r = await maakAchtergrond(db, { sleutel: 'test:1', invoer: { soort: 'bericht', titel: 'X', berichten: [] } },
      { aanroepen: { openai: nep }, vandaag: '2026-11-28', env: { OPENAI_API_KEY: 'x' } });
    expect(r.inhoud.dossier.kort.bronnen[0].url).toBe('https://gevonden.nl/x');
    expect(r.kosten_usd).toBeCloseTo(0.04 + 0.03 + 0.04, 6);
    const { rows } = await db.query(`SELECT status, kosten_usd::float8 AS k, zoekopdrachten FROM nz_llm_gebruik WHERE doel = 'achtergrond:test:1'`);
    expect(rows).toEqual([{ status: 'klaar', k: r.kosten_usd, zoekopdrachten: 4 }]);
    await schoon();
  });
});
