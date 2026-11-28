import 'server-only';
import { cache } from 'react';
import { pool } from './db';
import { herkenOnderwerpen, koppelVerhaal, zonderAccenten, type Herkomst } from './herkenning';
import { inhoud, type Item, type Samengevoegd } from './inhoud';

type FeedBron = {
  id: string; naam: string; homepage: string; soort: string; reikwijdte: Item['reikwijdte']; gebied: string | null;
  onderwerpen: string[]; laatste_controle: Date | null; laatste_succes: Date | null; laatste_fout: string | null;
  taal: 'nl' | 'en'; uitgever: string | null; laatste_aantal: number | null;
};

const feedBronnen = cache(async (): Promise<FeedBron[]> => {
  try {
    const { rows } = await pool().query(`SELECT * FROM nz_feedbronnen WHERE actief ORDER BY naam`);
    return rows;
  } catch {
    return []; // tabel bestaat nog niet (migratie niet gedraaid): alleen voorbeeldset
  }
});

/** Numerieke HTML-entiteiten die oudere ingestrondes niet omzetten (&#039;, &#8216;). */
const ontsleutel = (t: string) => t
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

// Herkenning per feedbericht hoeft maar één keer: dezelfde id en kop geven dezelfde uitkomst.
const herkend = new Map<string, { onderwerpen: Herkomst[]; verhaal?: string }>();

/** Voorbeeldset plus berichten van de afgelopen 7 dagen uit de ingest-worker, met onderwerpen en verhalen. */
export const inhoudMetFeeds = cache(async (): Promise<Samengevoegd> => {
  const basis = inhoud();
  const bronnen = await feedBronnen();
  if (!bronnen.length) return basis;
  const { rows } = await pool().query(
    `SELECT id, bron, url, titel, samenvatting, gepubliceerd, afbeelding, categorieen FROM nz_feeditems
     WHERE gepubliceerd > now() - interval '7 days' AND gepubliceerd < now() + interval '1 hour'
     ORDER BY gepubliceerd DESC LIMIT 2000`,
  );
  const perBron = new Map(bronnen.map((b) => [b.id, b]));
  const koppelbaar = [...basis.verhalen.values()].filter((v) => v.koppel?.length);
  const bekend = new Set(basis.items.map((i) => i.url));
  const zelfdeRedactie = new Set<string>();
  const items: Item[] = [];
  if (herkend.size > 20000) herkend.clear();
  for (const r of rows) {
    r.titel = ontsleutel(r.titel);
    r.samenvatting = ontsleutel(r.samenvatting ?? '');
    const b = perBron.get(r.bron);
    if (!b || bekend.has(r.url)) continue;
    // Dezelfde kop van dezelfde redactie in twee feeds (NOS en NOS Buitenland): één keer tonen.
    const sleutel = `${b.uitgever ?? b.id}|${zonderAccenten(r.titel).toLowerCase()}`;
    if (zelfdeRedactie.has(sleutel)) continue;
    zelfdeRedactie.add(sleutel);
    bekend.add(r.url);
    const cacheSleutel = `${r.id}|${r.titel}`;
    let h = herkend.get(cacheSleutel);
    if (!h) {
      const verhaal = koppelVerhaal({ titel: r.titel, samenvatting: r.samenvatting }, koppelbaar);
      const v = verhaal ? basis.verhalen.get(verhaal) : undefined;
      const eigen = herkenOnderwerpen({
        titel: r.titel, samenvatting: r.samenvatting, categorieen: r.categorieen ?? [], reikwijdte: b.reikwijdte,
        bronOnderwerpen: b.onderwerpen, taal: b.taal,
      });
      const viaVerhaal: Herkomst[] = (v?.onderwerpen ?? []).filter((o) => !eigen.some((e) => e.id === o)).map((id) => ({ id, via: 'verhaal' }));
      h = { onderwerpen: [...eigen, ...viaVerhaal], verhaal };
      herkend.set(cacheSleutel, h);
    }
    items.push({
      id: `feed-${r.id}`, titel: r.titel, bron: r.bron, uitgever: b.uitgever ?? undefined, url: r.url,
      gepubliceerd: new Date(r.gepubliceerd).toISOString(), samenvatting: r.samenvatting,
      soort: b.soort === 'overheid' || b.soort === 'bedrijf' ? 'mededeling' : 'journalistiek',
      belang: feedBelang(h), reikwijdte: b.reikwijdte, gebied: b.gebied ?? undefined, onderwerpen: h.onderwerpen.map((o) => o.id),
      herkomst: 'feed', taal: b.taal ?? 'nl', afbeelding: r.afbeelding ?? undefined, waaromOnderwerp: h.onderwerpen,
      verhaal: h.verhaal, gekoppeld: !!h.verhaal,
    });
  }
  const alleBronnen = new Map(basis.bronnen);
  for (const b of bronnen) {
    if (!alleBronnen.has(b.id)) alleBronnen.set(b.id, { id: b.id, naam: b.naam, url: b.homepage, soort: b.soort as never, gebied: b.gebied ?? undefined });
  }
  return { ...basis, bronnen: alleBronnen, items: [...basis.items, ...items] };
});

/**
 * Belang van een feedbericht: 1, plus 0,5 als het bij een lopend verhaal hoort en 0,5 als er een onderwerp is
 * herkend (niet alleen via de bron). Berichten zonder herkenbaar onderwerp zijn vaak achtergrond of vermaak.
 */
export function feedBelang(h: { onderwerpen: Herkomst[]; verhaal?: string }): number {
  return 1 + (h.verhaal ? 0.5 : 0) + (h.onderwerpen.some((o) => o.via !== 'bron') ? 0.5 : 0);
}

export type Versheid = { laatsteSucces: string | null; bronnen: number; ok: number; mislukt: string[] };

/** Wanneer is er voor het laatst nieuws opgehaald, en hoeveel bronnen werken? Voor "Bijgewerkt … geleden". */
export const versheid = cache(async (): Promise<Versheid> => {
  const bronnen = await feedBronnen();
  const succes = bronnen.map((b) => b.laatste_succes).filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime());
  const mislukt = bronnen.filter((b) => b.laatste_fout).map((b) => b.naam);
  return { laatsteSucces: succes[0]?.toISOString() ?? null, bronnen: bronnen.length, ok: bronnen.length - mislukt.length, mislukt };
});

export type BronStatus = {
  id: string; naam: string; url: string; soort: string; reikwijdte?: Item['reikwijdte']; taal?: string; gebied?: string;
  controle?: 'ok' | 'mislukt'; laatsteControle?: string; laatsteSucces?: string; fout?: string; aantal?: number;
  laatsteBericht?: string; berichten7d?: number;
};

/** Alle bronnen: automatisch gecontroleerde feeds met hun status, plus handmatig verzamelde bronnen. */
export async function alleBronnen(): Promise<BronStatus[]> {
  const i = await inhoudMetFeeds();
  const feeds = await feedBronnen();
  const telling = new Map<string, number>();
  for (const x of i.items) if (x.herkomst === 'feed') telling.set(x.bron, (telling.get(x.bron) ?? 0) + 1);
  const uit: BronStatus[] = feeds.map((b) => ({
    id: b.id, naam: b.naam, url: b.homepage, soort: b.soort, reikwijdte: b.reikwijdte, taal: b.taal, gebied: b.gebied ?? undefined,
    controle: b.laatste_controle ? (b.laatste_fout ? 'mislukt' : 'ok') : undefined,
    laatsteControle: b.laatste_controle?.toISOString(),
    laatsteSucces: b.laatste_succes?.toISOString(),
    fout: b.laatste_fout ?? undefined,
    aantal: b.laatste_aantal ?? undefined,
    berichten7d: telling.get(b.id) ?? 0,
  }));
  const metFeed = new Set(feeds.map((b) => b.id));
  for (const b of i.bronnen.values()) {
    if (metFeed.has(b.id)) continue;
    const eigen = i.items.filter((x) => x.bron === b.id);
    if (!eigen.length && !b.gebied) continue;
    uit.push({
      id: b.id, naam: b.naam, url: b.url, soort: b.soort, gebied: b.gebied,
      laatsteBericht: eigen.map((x) => x.gepubliceerd).sort().at(-1),
    });
  }
  return uit;
}

/** Bronnen voor een gebied. */
export async function bronnenInGebied(gebied: string): Promise<BronStatus[]> {
  return (await alleBronnen()).filter((b) => b.gebied === gebied);
}

export type IngestRonde = { gestart: string; klaar: string | null; bronnen: number; gelukt: number; mislukt: number; nieuw: number; fouten: { bron: string; fout: string }[] };

export async function ingestRondes(n = 12): Promise<IngestRonde[]> {
  try {
    const { rows } = await pool().query(
      `SELECT gestart_at, klaar_at, bronnen, gelukt, mislukt, nieuw, fouten FROM nz_ingest_rondes ORDER BY gestart_at DESC LIMIT $1`, [n],
    );
    return rows.map((r) => ({
      gestart: r.gestart_at.toISOString(), klaar: r.klaar_at?.toISOString() ?? null, bronnen: r.bronnen, gelukt: r.gelukt,
      mislukt: r.mislukt, nieuw: r.nieuw, fouten: r.fouten ?? [],
    }));
  } catch {
    return [];
  }
}
