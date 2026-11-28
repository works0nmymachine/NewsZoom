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
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= max) return t;
  const kort = t.slice(0, max);
  return `${kort.slice(0, Math.max(kort.lastIndexOf(' '), max - 40))}…`;
}

const geldigeUrl = (u) => /^https?:\/\//i.test(u ?? '');

/** Eerste afbeelding: enclosure, media:content, media:thumbnail of een <img> in de tekst. Alleen https. */
export function afbeeldingVan(i, html = '') {
  const kandidaten = [];
  for (const e of lijst(i.enclosure)) {
    const type = String(e?.['@type'] ?? '');
    const url = e?.['@url'];
    if (url && (type.startsWith('image/') || (!type && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)))) kandidaten.push(url);
  }
  for (const m of [...lijst(i['media:content']), ...lijst(i['media:group']?.['media:content'])]) {
    const type = String(m?.['@type'] ?? '');
    const medium = String(m?.['@medium'] ?? '');
    if (m?.['@url'] && (medium === 'image' || type.startsWith('image/') || (!medium && !type))) kandidaten.push(m['@url']);
  }
  for (const t of [...lijst(i['media:thumbnail']), ...lijst(i['media:group']?.['media:thumbnail'])]) if (t?.['@url']) kandidaten.push(t['@url']);
  const img = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  if (img) kandidaten.push(img[1].replace(/&amp;/g, '&'));
  const url = kandidaten.find((u) => /^https:\/\//i.test(String(u)) && String(u).length <= 1000);
  return url ? String(url) : null;
}

/** RSS-categorieën als korte, unieke teksten. */
export function categorieenVan(x) {
  const uit = [];
  for (const c of lijst(x)) {
    const t = schoon(tekst(c) || (typeof c === 'object' ? c?.['@term'] ?? c?.['@label'] ?? '' : ''), 80);
    if (t && !uit.includes(t)) uit.push(t);
  }
  return uit.slice(0, 10);
}

export function parseFeed(xml, { max = 50 } = {}) {
  const d = parser.parse(xml);
  const items = [];
  if (d?.rss?.channel) {
    for (const i of lijst(d.rss.channel.item)) {
      const url = tekst(i.link) || (geldigeUrl(tekst(i.guid)) ? tekst(i.guid) : '');
      const html = tekst(i.description) || tekst(i['content:encoded']);
      items.push({
        guid: tekst(i.guid) || url,
        url,
        titel: schoon(tekst(i.title), 300),
        samenvatting: schoon(html),
        gepubliceerd: tekst(i.pubDate) || tekst(i['dc:date']),
        afbeelding: afbeeldingVan(i, `${html} ${tekst(i['content:encoded'])}`),
        categorieen: categorieenVan(i.category),
      });
    }
  } else if (d?.['rdf:RDF']) {
    // RSS 1.0 (RDF), bijvoorbeeld DW.
    for (const i of lijst(d['rdf:RDF'].item)) {
      const url = tekst(i.link) || i['@rdf:about'] || '';
      const html = tekst(i.description) || tekst(i['content:encoded']);
      items.push({
        guid: i['@rdf:about'] || url,
        url,
        titel: schoon(tekst(i.title), 300),
        samenvatting: schoon(html),
        gepubliceerd: tekst(i['dc:date']) || tekst(i.pubDate),
        afbeelding: afbeeldingVan(i, html),
        categorieen: categorieenVan(i['dc:subject']),
      });
    }
  } else if (d?.feed) {
    for (const e of lijst(d.feed.entry)) {
      const links = lijst(e.link);
      const link = links.find((l) => l?.['@rel'] === 'alternate' || !l?.['@rel']) ?? links[0];
      const url = typeof link === 'string' ? link : link?.['@href'] ?? '';
      const html = tekst(e.summary) || tekst(e.content);
      items.push({
        guid: tekst(e.id) || url,
        url,
        titel: schoon(tekst(e.title), 300),
        samenvatting: schoon(html),
        gepubliceerd: tekst(e.published) || tekst(e.updated),
        afbeelding: afbeeldingVan(e, `${html} ${tekst(e.content)}`),
        categorieen: categorieenVan(e.category),
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

/** Puzzels, aanbiedingen en vaste rubrieken die een bron zelf als ruis markeert (feeds.json: negeer). */
export function negeren(item, negeer) {
  if (!negeer) return false;
  if ((negeer.titels ?? []).some((p) => new RegExp(p, 'i').test(item.titel))) return true;
  const cat = new Set((negeer.categorieen ?? []).map((c) => c.toLowerCase()));
  return (item.categorieen ?? []).some((c) => cat.has(c.toLowerCase()));
}
