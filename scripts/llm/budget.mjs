// Budgetbewaking: reserveer vóór een aanroep, boek daarna de echte kosten. Een advisory lock voorkomt
// dat twee gelijktijdige aanvragen samen over het budget gaan.
import { maandVan } from './prijzen.mjs';

export class BudgetOp extends Error {}

export async function instelling(db, sleutel, standaard) {
  const { rows } = await db.query(`SELECT waarde FROM nz_instellingen WHERE sleutel = $1`, [sleutel]);
  return rows[0] ? rows[0].waarde : standaard;
}

export async function budgetUsd(db, env = process.env) {
  const v = Number(await instelling(db, 'llm_budget_usd', Number(env.NZ_LLM_BUDGET_USD ?? 10)));
  return Number.isFinite(v) && v >= 0 ? v : 10;
}

export async function besteedDezeMaand(db, maand = maandVan()) {
  const { rows } = await db.query(
    `SELECT coalesce(sum(coalesce(kosten_usd, geschat_usd)), 0)::float8 AS usd FROM nz_llm_gebruik WHERE maand = $1 AND (status <> 'mislukt' OR kosten_usd IS NOT NULL)`,
    [maand],
  );
  return rows[0].usd;
}

export async function reserveer(db, { doel, provider, model, geschat }) {
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    await c.query(`SELECT pg_advisory_xact_lock(hashtext('nz_llm_budget'))`);
    const maand = maandVan();
    const budget = await budgetUsd(c);
    const besteed = await besteedDezeMaand(c, maand);
    if (besteed + geschat > budget) {
      await c.query('ROLLBACK');
      throw new BudgetOp(`Maandbudget bereikt: $${besteed.toFixed(2)} van $${budget.toFixed(2)} gebruikt; deze aanvraag kan tot $${geschat.toFixed(2)} kosten.`);
    }
    const { rows } = await c.query(
      `INSERT INTO nz_llm_gebruik (maand, doel, provider, model, geschat_usd) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [maand, doel, provider, model, geschat],
    );
    await c.query('COMMIT');
    return rows[0].id;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export async function boek(db, id, { status, kosten_usd, gebruik = {}, fout = null, model }) {
  await db.query(
    `UPDATE nz_llm_gebruik SET status = $2, kosten_usd = $3, invoer_tokens = $4, cache_lees_tokens = $5,
       cache_schrijf_tokens = $6, uitvoer_tokens = $7, zoekopdrachten = $8, fout = $9, model = coalesce($10, model)
     WHERE id = $1`,
    [id, status, kosten_usd, gebruik.invoer ?? 0, gebruik.cache_lees ?? 0, gebruik.cache_schrijf ?? 0,
      gebruik.uitvoer ?? 0, gebruik.zoekopdrachten ?? 0, fout ? String(fout).slice(0, 500) : null, model ?? null],
  );
}
