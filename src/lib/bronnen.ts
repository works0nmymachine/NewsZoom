import 'server-only';
import { parseFeed } from '../../scripts/feed-parser.mjs';
import { lijktFeed, titelUit, veiligOphalen, vindFeedLinks } from '../../scripts/veilig-ophalen.mjs';
import { agenda } from './agenda-data';
import { pool } from './db';
import { finance } from './finance';

/** Waarvoor een bron gebruikt wordt. Bepaalt waar de berichten verschijnen. */
export const DOELEN = {
  nederland: { naam: 'Nederland', uitleg: 'Vandaag en Ontdekken → Nederland.', reikwijdte: 'nederland', gebied: null, onderwerpen: [] as string[] },
  wereld: { naam: 'Wereld', uitleg: 'Vandaag en Ontdekken → Wereld. Ook gebruikt voor je eigen interesses.', reikwijdte: 'wereld', gebied: null, onderwerpen: [] as string[] },
  lokaal: { naam: 'Lokaal: Amsterdam', uitleg: 'Vandaag en Ontdekken → Lokaal.', reikwijdte: 'lokaal', gebied: 'amsterdam', onderwerpen: [] as string[] },
  finance: { naam: 'Finance', uitleg: 'Koersen voor Finance, plus economisch nieuws (Ontdekken, onderwerp Economie). Feedberichten worden nog niet automatisch aan koersen gekoppeld.', reikwijdte: 'wereld', gebied: null, onderwerpen: ['economie'] },
  agenda: { naam: 'Agenda', uitleg: 'Evenementen, verstoringen en films. De agenda is nog een handmatig verzamelde voorbeeldset; nieuwe bronnen worden als voorstel bewaard.', reikwijdte: null, gebied: null, onderwerpen: [] as string[] },
  achtergrond: { naam: 'Achtergrond', uitleg: 'Het taalmodel zoekt zelf op het web. Alleen links die het tijdens de opdracht echt vond worden getoond.', reikwijdte: null, gebied: null, onderwerpen: [] as string[] },
} as const;
export type Doel = keyof typeof DOELEN;
export const FEED_DOELEN: Doel[] = ['nederland', 'wereld', 'lokaal', 'finance'];

export type FeedBronRij = {
  id: string; naam: string; homepage: string; feed_url: string; soort: string; reikwijdte: string; gebied: string | null;
  onderwerpen: string[]; actief: boolean; gepauzeerd: boolean; herkomst: 'bestand' | 'gebruiker';
  laatste_controle: Date | null; laatste_succes: Date | null; laatste_fout: string | null; items_7d: number;
};

export function doelVanFeed(b: Pick<FeedBronRij, 'reikwijdte' | 'onderwerpen'>): Doel {
  if (b.onderwerpen.includes('economie')) return 'finance';
  return b.reikwijdte as Doel;
}

export async function feedBronnenMetStatus(): Promise<FeedBronRij[]> {
  try {
    const { rows } = await pool().query(
      `SELECT b.*, (SELECT count(*)::int FROM nz_feeditems f WHERE f.bron = b.id AND f.gepubliceerd > now() - interval '7 days') AS items_7d
       FROM nz_feedbronnen b WHERE b.actief ORDER BY b.herkomst, b.naam`,
    );
    return rows;
  } catch {
    return [];
  }
}

export type KoersBronRij = { reeks: string; bron: string; laatste_controle: Date | null; laatste_fout: string | null };
export async function koersBronnen(): Promise<KoersBronRij[]> {
  try {
    return (await pool().query(`SELECT reeks, bron, laatste_controle, laatste_fout FROM nz_koersbronnen ORDER BY reeks`)).rows;
  } catch {
    return [];
  }
}

/** Handmatig verzamelde bronnen van de voorbeeldset: alleen lezen. */
export function vasteBronnen() {
  const a = agenda();
  const tel = new Map<string, { naam: string; url: string; aantal: number }>();
  for (const e of a.evenementen) {
    const host = new URL(e.bron.url).origin;
    const k = e.bron.naam;
    const x = tel.get(k) ?? { naam: k, url: host, aantal: 0 };
    x.aantal++;
    tel.set(k, x);
  }
  for (const f of a.films) {
    const k = f.bron.naam;
    const x = tel.get(k) ?? { naam: k, url: new URL(f.bron.url).origin, aantal: 0 };
    x.aantal++;
    tel.set(k, x);
  }
  return {
    agenda: [...tel.values()].sort((p, q) => q.aantal - p.aantal),
    finance: finance().bronnen.map((b) => ({ naam: b.naam, url: b.url })),
  };
}

/** Websites die vaak als bron in automatische achtergronden terugkomen. */
export async function achtergrondDomeinen(): Promise<{ domein: string; aantal: number }[]> {
  try {
    const { rows } = await pool().query(`SELECT inhoud FROM nz_achtergronden WHERE status = 'klaar' ORDER BY klaar_at DESC LIMIT 100`);
    const tel = new Map<string, number>();
    for (const r of rows) {
      for (const laag of Object.values(r.inhoud?.dossier ?? {}) as { bronnen?: { url: string }[] }[]) {
        for (const b of laag.bronnen ?? []) {
          try { const d = new URL(b.url).hostname.replace(/^www\./, ''); tel.set(d, (tel.get(d) ?? 0) + 1); } catch { /* */ }
        }
      }
    }
    return [...tel].map(([domein, aantal]) => ({ domein, aantal })).sort((a, b) => b.aantal - a.aantal).slice(0, 15);
  } catch {
    return [];
  }
}

const UA = 'Mozilla/5.0 (compatible; NewsZoom/0.1; +https://newszoom.craftstudio.work)';
const KOP = { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, text/html;q=0.9, application/xml;q=0.8, */*;q=0.5' };
const GOK = ['/feed', '/rss', '/rss.xml', '/feed.xml', '/atom.xml'];

export type FeedVondst = { feedUrl: string; homepage: string; titel: string; items: ReturnType<typeof parseFeed> };

/** Zoekt de feed bij een webadres: het adres zelf, <link rel="alternate"> in de HTML, of een paar gangbare paden. */
export async function zoekFeed(url: string): Promise<{ vondst: FeedVondst | null; pagina: string; titel: string }> {
  const eerste = await veiligOphalen(url, { headers: KOP, maxBytes: 3_000_000 });
  const homepage = new URL(eerste.url).origin;
  const probeer = async (u: string, r?: { body: string; url: string; status: number }): Promise<FeedVondst | null> => {
    try {
      const x = r ?? await veiligOphalen(u, { headers: KOP, maxBytes: 5_000_000 });
      if (x.status < 200 || x.status >= 300 || !lijktFeed(x.body)) return null;
      return { feedUrl: x.url, homepage, titel: titelUit(x.body), items: parseFeed(x.body) };
    } catch {
      return null;
    }
  };
  if (eerste.status >= 400) throw new Error(`HTTP ${eerste.status}`);
  const direct = await probeer(eerste.url, eerste);
  if (direct) return { vondst: direct, pagina: eerste.url, titel: direct.titel };
  const titel = titelUit(eerste.body);
  for (const kandidaat of vindFeedLinks(eerste.body, eerste.url).slice(0, 3)) {
    const v = await probeer(kandidaat);
    if (v) return { vondst: v, pagina: eerste.url, titel };
  }
  for (const pad of GOK) {
    const v = await probeer(new URL(pad, homepage).toString());
    if (v) return { vondst: v, pagina: eerste.url, titel };
  }
  return { vondst: null, pagina: eerste.url, titel };
}
