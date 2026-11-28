import { describe, expect, it } from 'vitest';
import { negeren, parseFeed, schoon } from '../../scripts/feed-parser.mjs';

describe('parseFeed', () => {
  it('leest RSS', () => {
    const xml = `<?xml version="1.0"?><rss><channel><item><title>Kop &amp; meer</title><link>https://a.nl/1</link>
      <guid isPermaLink="false">abc</guid><description><![CDATA[<p>Tekst <b>vet</b></p>]]></description>
      <pubDate>Fri, 27 Nov 2026 10:00:00 +0100</pubDate></item><item><title>Zonder link</title></item></channel></rss>`;
    const [i, ...rest] = parseFeed(xml);
    expect(rest).toHaveLength(0);
    expect(i).toMatchObject({ guid: 'abc', url: 'https://a.nl/1', titel: 'Kop & meer', samenvatting: 'Tekst vet' });
    expect(i.gepubliceerd.toISOString()).toBe('2026-11-27T09:00:00.000Z');
  });

  it('leest Atom', () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>urn:1</id><title>Atom</title>
      <link rel="alternate" href="https://b.nl/x"/><updated>2026-11-26T08:00:00Z</updated><summary>Kort</summary></entry></feed>`;
    expect(parseFeed(xml)[0]).toMatchObject({ guid: 'urn:1', url: 'https://b.nl/x', titel: 'Atom', samenvatting: 'Kort' });
  });

  it('weigert HTML', () => {
    expect(() => parseFeed('<html><body>Niet gevonden</body></html>')).toThrow();
  });

  it('schoon zet numerieke entiteiten om', () => {
    expect(schoon('clearly marked&#039; en &#8216;kop&#8217; &#x2014; klaar')).toBe("clearly marked' en ‘kop’ — klaar");
  });

  it('schoon kort in op een woordgrens', () => {
    expect(schoon('<p>een twee drie vier</p>', 12)).toBe('een twee…');
  });
});

describe('afbeeldingen, categorieën en ruis', () => {
  it('leest enclosure, media:content en categorieën', () => {
    const xml = `<rss xmlns:media="http://search.yahoo.com/mrss/"><channel>
      <item><title>Een</title><link>https://a.nl/1</link><pubDate>Fri, 27 Nov 2026 10:00:00 +0100</pubDate>
        <enclosure url="https://img.a.nl/1.jpg" type="image/jpeg" length="1"/><category>Politiek</category><category>Politiek</category></item>
      <item><title>Twee</title><link>https://a.nl/2</link><pubDate>Fri, 27 Nov 2026 10:00:00 +0100</pubDate>
        <media:content url="https://img.a.nl/2.jpg" medium="image"/></item>
      <item><title>Drie</title><link>https://a.nl/3</link><pubDate>Fri, 27 Nov 2026 10:00:00 +0100</pubDate>
        <description><![CDATA[<img src="http://onveilig.nl/x.jpg"> tekst]]></description></item>
    </channel></rss>`;
    const [een, twee, drie] = parseFeed(xml);
    expect(een).toMatchObject({ afbeelding: 'https://img.a.nl/1.jpg', categorieen: ['Politiek'] });
    expect(twee.afbeelding).toBe('https://img.a.nl/2.jpg');
    expect(drie.afbeelding).toBeNull();
  });

  it('leest RSS 1.0 (RDF)', () => {
    const xml = `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <item rdf:about="https://dw.com/a"><title>DW</title><link>https://dw.com/a</link><dc:date>2026-11-27T10:00:00Z</dc:date><dc:subject>World</dc:subject></item></rdf:RDF>`;
    expect(parseFeed(xml)[0]).toMatchObject({ url: 'https://dw.com/a', titel: 'DW', categorieen: ['World'] });
  });

  it('negeert puzzels en aanbiedingen', () => {
    const negeer = { titels: ['^Briljant\\b'], categorieen: ['De puzzels van vandaag'] };
    expect(negeren({ titel: 'Briljant', categorieen: [] }, negeer)).toBe(true);
    expect(negeren({ titel: 'Kop', categorieen: ['de puzzels van vandaag'] }, negeer)).toBe(true);
    expect(negeren({ titel: 'Briljante zet van kabinet', categorieen: [] }, negeer)).toBe(false);
    expect(negeren({ titel: 'Kop', categorieen: [] }, undefined)).toBe(false);
  });
});
