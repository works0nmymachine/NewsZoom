import 'server-only';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Bericht, Bron, Inhoud, Onderwerp, Verhaal } from './inhoud-types';

export const DATA_MAP = path.join(process.cwd(), 'data', 'mvp');

/** Eén nieuwsbericht zoals de schermen het tonen: uit de voorbeeldset of later uit de ingest. */
export type Item = {
  id: string;
  verhaal?: string;
  titel: string;
  bron: string;
  url: string;
  gepubliceerd: string;
  samenvatting: string;
  nieuw?: string;
  soort: 'journalistiek' | 'mededeling';
  belang: number;
  reikwijdte: 'nederland' | 'wereld' | 'lokaal';
  gebied?: string;
  onderwerpen: string[];
  herkomst: 'voorbeeldset' | 'feed';
};

export type Samengevoegd = {
  bronnen: Map<string, Bron>;
  onderwerpen: Map<string, Onderwerp>;
  verhalen: Map<string, Verhaal>;
  items: Item[];
  peildatum: string | null; // nieuwste publicatiedatum in de voorbeeldset
};

let cache: { sleutel: string; waarde: Samengevoegd } | null = null;

function leesJson<T>(bestand: string): T {
  return JSON.parse(readFileSync(path.join(DATA_MAP, bestand), 'utf8')) as T;
}

export function jsonBestanden(): string[] {
  try {
    return readdirSync(DATA_MAP).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return [];
  }
}

export function voegSamen(delen: Partial<Inhoud>[]): Samengevoegd {
  const bronnen = new Map<string, Bron>();
  const onderwerpen = new Map<string, Onderwerp>();
  const verhalen = new Map<string, Verhaal>();
  const berichten: Bericht[] = [];
  for (const d of delen) {
    for (const b of d.bronnen ?? []) if (!bronnen.has(b.id) || (b.gebied && !bronnen.get(b.id)?.gebied)) bronnen.set(b.id, b);
    for (const o of d.onderwerpen ?? []) if (!onderwerpen.has(o.id)) onderwerpen.set(o.id, o);
    for (const v of d.verhalen ?? []) verhalen.set(v.id, v);
    berichten.push(...(d.berichten ?? []));
  }
  const gezien = new Set<string>();
  const items: Item[] = [];
  for (const b of berichten) {
    const v = verhalen.get(b.verhaal);
    if (!v || gezien.has(b.id)) continue;
    gezien.add(b.id);
    items.push({
      ...b, reikwijdte: v.reikwijdte, gebied: v.gebied, onderwerpen: v.onderwerpen, herkomst: 'voorbeeldset',
    });
  }
  const peildatum = items.reduce<string | null>((m, i) => (!m || i.gepubliceerd > m ? i.gepubliceerd : m), null);
  return { bronnen, onderwerpen, verhalen, items, peildatum };
}

/** Leest alle data/mvp/*.json en voegt ze samen. */
export function inhoud(): Samengevoegd {
  const bestanden = jsonBestanden();
  const sleutel = bestanden.map((f) => `${f}:${statSync(path.join(DATA_MAP, f)).mtimeMs}`).join('|');
  if (cache?.sleutel === sleutel) return cache.waarde;
  // Ook finance.json en agenda.json: hun bronnen helpen bij namen; berichten zonder bekend verhaal vallen weg.
  const waarde = voegSamen(bestanden.map((f) => leesJson<Partial<Inhoud>>(f)));
  cache = { sleutel, waarde };
  return waarde;
}

export function leesDataBestand<T>(bestand: string): T | null {
  try {
    return leesJson<T>(bestand);
  } catch {
    return null;
  }
}
