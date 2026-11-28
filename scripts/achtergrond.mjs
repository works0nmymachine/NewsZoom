// Stelt een achtergronddossier samen met een taalmodel dat zelf op het web zoekt.
// Pure delen (prompt, uitlezen, controle van links) zijn los getest; de aanroep zit in maakAchtergrond.
import { boek, instelling, reserveer } from './llm/budget.mjs';
import { kosten, prijslijst, schatting, STANDAARD_MODEL } from './llm/prijzen.mjs';

export const MAX_UITVOER = 12000;
export const MAX_ZOEK = 8;

export const SYSTEEM = `Je bent eindredacteur van NewsZoom, een Nederlandse nieuwsapp die nieuws uitlegt op meerdere tijdschalen.
Je stelt een achtergronddossier samen bij een nieuwsverhaal of artikel. Zoek op het web naar eerdere berichtgeving, officiële bronnen en de geschiedenis van het onderwerp.

Regels:
- Schrijf in helder Nederlands, in je eigen woorden. Neem geen zinnen over uit artikelen.
- Elke feitelijke bewering moet steunen op een bron die je tijdens deze opdracht via zoeken hebt gevonden. Verzin geen links, titels of datums.
- Markeer interpretatie expliciet (bijvoorbeeld met "Interpretatie:").
- Bij tegenstrijdige bronnen: noem wie welke lezing geeft.
- Benoem gevolgen voor mensen apart van politieke of militaire gevolgen.
- Weet je iets niet zeker, laat het weg of zet het bij "onzeker".

Lever als laatste deel van je antwoord uitsluitend één JSON-object, zonder uitleg ervoor of erna, met precies deze vorm:
{
  "titel": "korte titel van het lopende verhaal",
  "laatsteOntwikkeling": "één zin",
  "watVerandert": { "tekst": "wat veranderde en voor wie", "onzeker": "wat nog onzeker is" },
  "partijen": [ { "naam": "...", "belang": "..." } ],
  "dossier": {
    "kort":             { "tekst": "3-5 zinnen", "bronnen": [ { "titel": "...", "url": "https://...", "bron": "naam van de uitgever", "datum": "YYYY-MM-DD" } ] },
    "dezeWeek":         { "tekst": "...", "bronnen": [ ... ] },
    "afgelopenMaanden": { "tekst": "...", "bronnen": [ ... ] },
    "vanafBegin":       { "tekst": "...", "bronnen": [ ... ] }
  }
}
Alinea's in "tekst" scheid je met een lege regel. Geef per laag 2 tot 5 bronnen.`;

export function bouwPrompt(invoer, vandaag) {
  const regels = [`Vandaag is het ${vandaag}.`, ''];
  if (invoer.soort === 'verhaal') {
    regels.push(`Verhaal: ${invoer.titel}`);
    if (invoer.laatsteOntwikkeling) regels.push(`Laatste ontwikkeling volgens NewsZoom: ${invoer.laatsteOntwikkeling}`);
    if (invoer.watVerandert) regels.push(`Wat het verandert volgens NewsZoom: ${invoer.watVerandert}`);
  } else {
    regels.push(`Artikel waarbij de lezer achtergrond vraagt: ${invoer.titel}`);
  }
  regels.push('', 'Bekende berichten:');
  for (const b of invoer.berichten ?? []) {
    regels.push(`- ${b.datum} · ${b.bron}: ${b.titel} (${b.url})${b.samenvatting ? `\n  ${b.samenvatting}` : ''}`);
  }
  regels.push('', 'Stel het dossier samen: Kort, Deze week (de afgelopen zeven dagen), Afgelopen maanden en Vanaf het begin.');
  return regels.join('\n');
}

/** Haalt het laatste JSON-object uit de tekst. */
export function leesJson(tekst) {
  const schoon = tekst.replace(/```(?:json)?/g, '');
  const eind = schoon.lastIndexOf('}');
  if (eind < 0) throw new Error('Geen JSON in het antwoord.');
  for (let begin = schoon.lastIndexOf('{', eind); begin >= 0; begin = schoon.lastIndexOf('{', begin - 1)) {
    try {
      const v = JSON.parse(schoon.slice(begin, eind + 1));
      if (v && typeof v === 'object' && v.dossier) return v;
    } catch { /* verder naar een eerdere accolade */ }
  }
  throw new Error('Het antwoord bevatte geen geldig dossier.');
}

const LAGEN = ['kort', 'dezeWeek', 'afgelopenMaanden', 'vanafBegin'];
const str = (x, max) => (typeof x === 'string' ? x.trim().slice(0, max) : '');
const normUrl = (u) => { try { const x = new URL(u); x.hash = ''; return x.toString().replace(/\/$/, ''); } catch { return null; } };

/**
 * Controleert de vorm en houdt alleen links die het model echt gevonden heeft (of die al bekend waren).
 * Een link met een onbekende url wordt weggelaten; zo komen er geen verzonnen bronnen in de app.
 */
export function controleer(ruw, toegestaneUrls) {
  const toegestaan = new Set([...toegestaneUrls].map(normUrl).filter(Boolean));
  let weggelaten = 0;
  const links = (lijst) => (Array.isArray(lijst) ? lijst : []).flatMap((l) => {
    const url = normUrl(l?.url);
    if (!url || !/^https:\/\//.test(url) || !toegestaan.has(url)) { weggelaten++; return []; }
    const datum = /^\d{4}-\d{2}-\d{2}$/.test(l?.datum ?? '') ? l.datum : '';
    return [{ titel: str(l.titel, 300) || url, url, bron: str(l.bron, 100) || new URL(url).hostname.replace(/^www\./, ''), datum }];
  }).slice(0, 6);
  /** @type {Record<string, { tekst: string, bronnen: { titel: string, url: string, bron: string, datum: string }[] }>} */
  const dossier = {};
  for (const laag of LAGEN) {
    const l = ruw.dossier?.[laag];
    const tekst = str(l?.tekst, 6000);
    if (!tekst) throw new Error(`Laag ${laag} ontbreekt.`);
    dossier[laag] = { tekst, bronnen: links(l.bronnen) };
  }
  return {
    inhoud: {
      titel: str(ruw.titel, 200),
      laatsteOntwikkeling: str(ruw.laatsteOntwikkeling, 600),
      watVerandert: ruw.watVerandert ? { tekst: str(ruw.watVerandert.tekst, 3000), onzeker: str(ruw.watVerandert.onzeker, 1500) } : undefined,
      partijen: (Array.isArray(ruw.partijen) ? ruw.partijen : []).slice(0, 8).map((p) => ({ naam: str(p?.naam, 120), belang: str(p?.belang, 400) })).filter((p) => p.naam),
      dossier,
    },
    weggelaten,
  };
}

/** @param {any} db @param {Record<string, string | undefined>} [env] */
export async function kiesProvider(db, env = process.env) {
  const gekozen = await instelling(db, 'llm_provider', env.NZ_LLM_PROVIDER ?? null);
  const heeft = { openai: !!env.OPENAI_API_KEY, anthropic: !!env.ANTHROPIC_API_KEY };
  const provider = gekozen === 'uit' ? null : gekozen && heeft[gekozen] ? gekozen : heeft.openai ? 'openai' : heeft.anthropic ? 'anthropic' : null;
  if (!provider) return null;
  const model = await instelling(db, `${provider}_model`, env[provider === 'openai' ? 'NZ_OPENAI_MODEL' : 'NZ_ANTHROPIC_MODEL'] ?? STANDAARD_MODEL[provider]);
  return { provider, model };
}

/**
 * Voert één opdracht uit: budget reserveren, model aanroepen, kosten boeken, dossier controleren.
 * @param {any} db @param {{ sleutel: string, invoer: any }} opdracht
 * @param {{ aanroepen: Record<string, (a: any) => Promise<any>>, vandaag: string, env?: Record<string, string | undefined> }} opties
 */
export async function maakAchtergrond(db, opdracht, { aanroepen, vandaag, env = process.env }) {
  const keuze = await kiesProvider(db, env);
  if (!keuze) throw new Error('Geen taalmodel ingesteld: zet OPENAI_API_KEY of ANTHROPIC_API_KEY op de server.');
  const prompt = bouwPrompt(opdracht.invoer, vandaag);
  const lijst = prijslijst(env);
  const geschat = schatting({ ...keuze, promptTekens: SYSTEEM.length + prompt.length, maxUitvoer: MAX_UITVOER, maxZoek: MAX_ZOEK }, lijst);
  const id = await reserveer(db, { doel: `achtergrond:${opdracht.sleutel}`, ...keuze, geschat });
  let antwoord;
  try {
    antwoord = await aanroepen[keuze.provider]({ model: keuze.model, systeem: SYSTEEM, prompt, maxUitvoer: MAX_UITVOER, maxZoek: MAX_ZOEK });
  } catch (e) {
    // Bij een fout zonder antwoord is niets te meten; reken voorzichtig niets en laat de fout zien.
    await boek(db, id, { status: 'mislukt', kosten_usd: null, fout: e?.message ?? e });
    throw e;
  }
  const usd = kosten({ provider: keuze.provider, model: antwoord.model, ...antwoord.gebruik }, lijst);
  try {
    const bekend = (opdracht.invoer.berichten ?? []).map((b) => b.url);
    const { inhoud, weggelaten } = controleer(leesJson(antwoord.tekst), [...antwoord.gevondenUrls, ...bekend]);
    await boek(db, id, { status: 'klaar', kosten_usd: usd, gebruik: antwoord.gebruik, model: antwoord.model });
    return { inhoud: { ...inhoud, weggelatenLinks: weggelaten }, provider: keuze.provider, model: antwoord.model, kosten_usd: usd };
  } catch (e) {
    await boek(db, id, { status: 'mislukt', kosten_usd: usd, gebruik: antwoord.gebruik, fout: e?.message ?? e, model: antwoord.model });
    throw e;
  }
}
