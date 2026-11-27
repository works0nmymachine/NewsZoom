import { describe, expect, it } from 'vitest';
import { parseFeed, schoon } from '../../scripts/feed-parser.mjs';

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

  it('schoon kort in op een woordgrens', () => {
    expect(schoon('<p>een twee drie vier</p>', 12)).toBe('een twee…');
  });
});
