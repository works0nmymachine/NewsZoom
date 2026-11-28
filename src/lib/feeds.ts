import 'server-only';
import { cache } from 'react';
import { pool } from './db';
import { inhoud, type Item, type Samengevoegd } from './inhoud';

type FeedBron = {
  id: string; naam: string; homepage: string; soort: string; reikwijdte: Item['reikwijdte']; gebied: string | null;
  onderwerpen: string[]; laatste_controle: Date | null; laatste_succes: Date | null; laatste_fout: string | null;
};

const feedBronnen = cache(async (): Promise<FeedBron[]> => {
  try {
    const { rows } = await pool().query(`SELECT * FROM nz_feedbronnen WHERE actief ORDER BY naam`);
    return rows;
  } catch {
    return []; // tabel bestaat nog niet (migratie niet gedraaid): alleen voorbeeldset
  }
});

/** Voorbeeldset plus berichten van de afgelopen 7 dagen uit de ingest-worker. */
export const inhoudMetFeeds = cache(async (): Promise<Samengevoegd> => {
  const basis = inhoud();
  const bronnen = await feedBronnen();
  if (!bronnen.length) return basis;
  const { rows } = await pool().query(
    `SELECT id, bron, url, titel, samenvatting, gepubliceerd FROM nz_feeditems
     WHERE gepubliceerd > now() - interval '7 days' AND gepubliceerd < now() + interval '1 hour'
     ORDER BY gepubliceerd DESC LIMIT 600`,
  );
  const perBron = new Map(bronnen.map((b) => [b.id, b]));
  const bekend = new Set(basis.items.map((i) => i.url));
  const items: Item[] = [];
  for (const r of rows) {
    const b = perBron.get(r.bron);
    if (!b || bekend.has(r.url)) continue;
    bekend.add(r.url);
    items.push({
      id: `feed-${r.id}`, titel: r.titel, bron: r.bron, url: r.url, gepubliceerd: new Date(r.gepubliceerd).toISOString(),
      samenvatting: r.samenvatting, soort: b.soort === 'overheid' || b.soort === 'bedrijf' ? 'mededeling' : 'journalistiek',
      belang: 1, reikwijdte: b.reikwijdte, gebied: b.gebied ?? undefined, onderwerpen: b.onderwerpen, herkomst: 'feed',
    });
  }
  const alleBronnen = new Map(basis.bronnen);
  for (const b of bronnen) {
    if (!alleBronnen.has(b.id)) alleBronnen.set(b.id, { id: b.id, naam: b.naam, url: b.homepage, soort: b.soort as never, gebied: b.gebied ?? undefined });
  }
  return { ...basis, bronnen: alleBronnen, items: [...basis.items, ...items] };
});

export type BronStatus = {
  id: string; naam: string; url: string; soort: string;
  controle?: 'ok' | 'mislukt'; laatsteControle?: string; laatsteSucces?: string; fout?: string;
  laatsteBericht?: string;
};

/** Bronnen voor een gebied: automatisch gecontroleerde feeds met hun status, plus handmatig verzamelde bronnen. */
export async function bronnenInGebied(gebied: string): Promise<BronStatus[]> {
  const i = await inhoudMetFeeds();
  const feeds = (await feedBronnen()).filter((b) => b.gebied === gebied);
  const uit: BronStatus[] = feeds.map((b) => ({
    id: b.id, naam: b.naam, url: b.homepage, soort: b.soort,
    controle: b.laatste_controle ? (b.laatste_fout ? 'mislukt' : 'ok') : undefined,
    laatsteControle: b.laatste_controle?.toISOString(),
    laatsteSucces: b.laatste_succes?.toISOString(),
    fout: b.laatste_fout ?? undefined,
  }));
  const metFeed = new Set(feeds.map((b) => b.id));
  for (const b of i.bronnen.values()) {
    if (b.gebied !== gebied || metFeed.has(b.id)) continue;
    uit.push({
      id: b.id, naam: b.naam, url: b.url, soort: b.soort,
      laatsteBericht: i.items.filter((x) => x.bron === b.id).map((x) => x.gepubliceerd).sort().at(-1),
    });
  }
  return uit;
}

/** Eén bericht op id; feedberichten ouder dan 7 dagen komen rechtstreeks uit de database. */
export async function itemOpId(id: string): Promise<{ item: Item; inhoud: Samengevoegd } | null> {
  const i = await inhoudMetFeeds();
  const gevonden = i.items.find((x) => x.id === id);
  if (gevonden) return { item: gevonden, inhoud: i };
  const m = /^feed-(\d{1,18})$/.exec(id);
  if (!m) return null;
  const { rows } = await pool().query(
    `SELECT f.id, f.bron, f.url, f.titel, f.samenvatting, f.gepubliceerd, b.soort, b.reikwijdte, b.gebied, b.onderwerpen
     FROM nz_feeditems f JOIN nz_feedbronnen b ON b.id = f.bron WHERE f.id = $1`, [m[1]],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    inhoud: i,
    item: {
      id, titel: r.titel, bron: r.bron, url: r.url, gepubliceerd: new Date(r.gepubliceerd).toISOString(), samenvatting: r.samenvatting,
      soort: r.soort === 'overheid' || r.soort === 'bedrijf' ? 'mededeling' : 'journalistiek', belang: 1, reikwijdte: r.reikwijdte,
      gebied: r.gebied ?? undefined, onderwerpen: r.onderwerpen, herkomst: 'feed',
    },
  };
}
