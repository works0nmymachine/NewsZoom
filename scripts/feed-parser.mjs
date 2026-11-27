// Leest RSS 2.0 en Atom naar een vaste vorm. Geen netwerk, geen database: los te testen.
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  processEntities: true,
  htmlEntities: true,
  trimValues: true,
});

const lijst = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const tekst = (x) => {
  if (x == null) return '';
  if (typeof x === 'string' || typeof x === 'number') return String(x);
  if (typeof x === 'object' && '#text' in x) return String(x['#text']);
  return '';
};

/** HTML eruit, witruimte samen, ingekort tot max tekens op een woordgrens. */
export function schoon(html, max = 400) {
  const t = String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= max) return t;
  const kort = t.slice(0, max);
  return `${kort.slice(0, Math.max(kort.lastIndexOf(' '), max - 40))}…`;
}

const geldigeUrl = (u) => /^https?:\/\//i.test(u ?? '');

export function parseFeed(xml, { max = 50 } = {}) {
  const d = parser.parse(xml);
  const items = [];
  if (d?.rss?.channel) {
    for (const i of lijst(d.rss.channel.item)) {
      const url = tekst(i.link) || (geldigeUrl(tekst(i.guid)) ? tekst(i.guid) : '');
      items.push({
        guid: tekst(i.guid) || url,
        url,
        titel: schoon(tekst(i.title), 300),
        samenvatting: schoon(tekst(i.description) || tekst(i['content:encoded'])),
        gepubliceerd: tekst(i.pubDate) || tekst(i['dc:date']),
      });
    }
  } else if (d?.feed) {
    for (const e of lijst(d.feed.entry)) {
      const links = lijst(e.link);
      const link = links.find((l) => l?.['@rel'] === 'alternate' || !l?.['@rel']) ?? links[0];
      const url = typeof link === 'string' ? link : link?.['@href'] ?? '';
      items.push({
        guid: tekst(e.id) || url,
        url,
        titel: schoon(tekst(e.title), 300),
        samenvatting: schoon(tekst(e.summary) || tekst(e.content)),
        gepubliceerd: tekst(e.published) || tekst(e.updated),
      });
    }
  } else {
    throw new Error('Geen RSS of Atom');
  }
  return items
    .map((i) => ({ ...i, gepubliceerd: new Date(i.gepubliceerd) }))
    .filter((i) => i.titel && geldigeUrl(i.url) && !Number.isNaN(i.gepubliceerd.getTime()))
    .slice(0, max);
}
