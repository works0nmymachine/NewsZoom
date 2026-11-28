// Prijzen in USD per miljoen tokens en per 1000 webzoekopdrachten, volgens de publieke prijslijsten
// van Anthropic en OpenAI op 27 november 2026. Overschrijfbaar met NZ_LLM_PRIJZEN (JSON, zelfde vorm).
// De echte factuur kan afwijken (kortingen, btw, valuta); de teller is bedoeld als bewaking.

export const PRIJSPEILDATUM = '2026-11-27';

const STANDAARD = {
  anthropic: {
    zoeken_per_1000: 10,
    modellen: {
      'claude-opus-5-5': { invoer: 4, uitvoer: 20, cache_lees: 0.2, cache_schrijf: 5 },
      'claude-sonnet-5-5': { invoer: 2, uitvoer: 10, cache_lees: 0.1, cache_schrijf: 2.5 },
      'claude-haiku-5-5': { invoer: 0.1, uitvoer: 0.5, cache_lees: 0.01, cache_schrijf: 0.125 },
    },
  },
  openai: {
    zoeken_per_1000: 10,
    modellen: {
      'gpt-6.2-sol': { invoer: 2, uitvoer: 10, cache_lees: 0.1, cache_schrijf: 2 },
      'gpt-6.2-astra': { invoer: 8, uitvoer: 40, cache_lees: 0.4, cache_schrijf: 8 },
      'gpt-6-luna': { invoer: 0.1, uitvoer: 0.5, cache_lees: 0.01, cache_schrijf: 0.1 },
    },
  },
};

export const STANDAARD_MODEL = { anthropic: 'claude-opus-5-5', openai: 'gpt-6.2-sol' };

/** @typedef {{ invoer: number, uitvoer: number, cache_lees: number, cache_schrijf: number }} Prijs */
/** @typedef {Record<string, { zoeken_per_1000: number, modellen: Record<string, Prijs> }>} Prijslijst */

/** @param {Record<string, string | undefined>} [env] @returns {Prijslijst} */
export function prijslijst(env = process.env) {
  if (!env.NZ_LLM_PRIJZEN) return STANDAARD;
  try {
    const extra = JSON.parse(env.NZ_LLM_PRIJZEN);
    const uit = structuredClone(STANDAARD);
    for (const [p, v] of Object.entries(extra)) {
      uit[p] ??= { zoeken_per_1000: 10, modellen: {} };
      if (typeof v.zoeken_per_1000 === 'number') uit[p].zoeken_per_1000 = v.zoeken_per_1000;
      Object.assign(uit[p].modellen, v.modellen ?? {});
    }
    return uit;
  } catch {
    return STANDAARD;
  }
}

/** Kosten van één aanroep. Tokens zonder bekend model rekenen met het duurste model van die provider. */
export function kosten({ provider, model, invoer = 0, cache_lees = 0, cache_schrijf = 0, uitvoer = 0, zoekopdrachten = 0 }, lijst = prijslijst()) {
  const p = lijst[provider];
  if (!p) throw new Error(`Onbekende provider ${provider}`);
  const m = p.modellen[model] ?? Object.values(p.modellen).reduce((a, b) => (b.uitvoer > a.uitvoer ? b : a));
  const usd = (invoer * m.invoer + cache_lees * m.cache_lees + cache_schrijf * m.cache_schrijf + uitvoer * m.uitvoer) / 1e6
    + (zoekopdrachten * p.zoeken_per_1000) / 1000;
  return Math.round(usd * 1e6) / 1e6;
}

/** Ruime schatting vooraf, voor de budgetcontrole: maximale uitvoer en zoekopdrachten, geschatte invoer. */
export function schatting({ provider, model, promptTekens, maxUitvoer, maxZoek, tokensPerZoek = 6000 }, lijst = prijslijst()) {
  const invoer = Math.ceil(promptTekens / 3.5) + maxZoek * tokensPerZoek;
  return kosten({ provider, model, invoer, uitvoer: maxUitvoer, zoekopdrachten: maxZoek }, lijst);
}

export const maandVan = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit' }).format(d);
