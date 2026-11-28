import 'server-only';
import { kiesProvider } from '../../scripts/achtergrond.mjs';
import { besteedDezeMaand, budgetUsd, instelling } from '../../scripts/llm/budget.mjs';
import { maandVan, PRIJSPEILDATUM, prijslijst, STANDAARD_MODEL } from '../../scripts/llm/prijzen.mjs';
import { pool } from './db';

type Prijs = { invoer: number; uitvoer: number; cache_lees: number; cache_schrijf: number };
type Lijst = Record<string, { zoeken_per_1000: number; modellen: Record<string, Prijs> }>;

export type Aanroep = {
  id: number; moment: Date; doel: string; provider: string; model: string; status: string;
  geschat_usd: number; kosten_usd: number | null; invoer_tokens: number; cache_lees_tokens: number;
  uitvoer_tokens: number; zoekopdrachten: number; fout: string | null;
};

/** Alles voor de AI-sectie in Instellingen: keuze, budget, tokenteller van deze maand en de laatste aanroepen. */
export async function aiOverzicht() {
  const lijst = prijslijst() as Lijst;
  const maand = maandVan();
  const db = pool();
  const basis = {
    lijst, maand, peildatum: PRIJSPEILDATUM,
    keys: { openai: !!process.env.OPENAI_API_KEY, anthropic: !!process.env.ANTHROPIC_API_KEY },
  };
  try {
    const [budget, besteed, actief, gekozen, modelOpenai, modelAnthropic, totalen, laatste] = await Promise.all([
      budgetUsd(db),
      besteedDezeMaand(db, maand),
      kiesProvider(db),
      instelling(db, 'llm_provider', process.env.NZ_LLM_PROVIDER ?? null),
      instelling(db, 'openai_model', process.env.NZ_OPENAI_MODEL ?? STANDAARD_MODEL.openai),
      instelling(db, 'anthropic_model', process.env.NZ_ANTHROPIC_MODEL ?? STANDAARD_MODEL.anthropic),
      db.query(
        `SELECT count(*)::int AS aanroepen, coalesce(sum(invoer_tokens), 0)::int AS invoer, coalesce(sum(cache_lees_tokens), 0)::int AS cache,
           coalesce(sum(uitvoer_tokens), 0)::int AS uitvoer, coalesce(sum(zoekopdrachten), 0)::int AS zoek,
           count(*) FILTER (WHERE status = 'mislukt')::int AS mislukt
         FROM nz_llm_gebruik WHERE maand = $1`, [maand]),
      db.query(`SELECT * FROM nz_llm_gebruik ORDER BY moment DESC LIMIT 10`),
    ]);
    return {
      ...basis, ok: true as const, budget: budget as number, besteed: besteed as number,
      actief: actief as { provider: string; model: string } | null,
      gekozen: (gekozen as string | null) ?? 'automatisch',
      modellen: { openai: modelOpenai as string, anthropic: modelAnthropic as string },
      totalen: totalen.rows[0] as { aanroepen: number; invoer: number; cache: number; uitvoer: number; zoek: number; mislukt: number },
      laatste: laatste.rows.map((r) => ({ ...r, geschat_usd: Number(r.geschat_usd), kosten_usd: r.kosten_usd == null ? null : Number(r.kosten_usd) })) as Aanroep[],
    };
  } catch {
    return { ...basis, ok: false as const };
  }
}
