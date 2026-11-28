import { describe, expect, it } from 'vitest';
import { controleerUrl, lijktFeed, NietToegestaan, publiekAdres, veiligOphalen, vindFeedLinks } from '../../scripts/veilig-ophalen.mjs';

describe('SSRF-bescherming', () => {
  it('herkent interne adressen', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.18.0.5', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
      expect(publiekAdres(ip), ip).toBe(false);
    }
    for (const ip of ['1.1.1.1', '178.104.160.209', '2606:4700:4700::1111']) expect(publiekAdres(ip), ip).toBe(true);
  });
  it('weigert verkeerde schema’s, poorten en hosts', () => {
    for (const u of ['file:///etc/passwd', 'ftp://a.nl', 'http://a.nl:5432/', 'http://user:pw@a.nl/', 'http://127.0.0.1/', 'http://[::1]/', 'http://supabase-kong:8000/', 'geen url']) {
      expect(() => controleerUrl(u), u).toThrow(NietToegestaan);
    }
    expect(controleerUrl('https://www.parool.nl/rss').hostname).toBe('www.parool.nl');
  });
  it('weigert een naam die naar een intern adres wijst (na DNS)', async () => {
    await expect(veiligOphalen('http://localhost.localdomain/')).rejects.toThrow();
    await expect(veiligOphalen('http://127.0.0.1/')).rejects.toBeInstanceOf(NietToegestaan);
  });
});

describe('feeddetectie', () => {
  it('vindt rss- en atom-links in HTML', () => {
    const html = `<head><link rel="stylesheet" href="/a.css"><link rel="alternate" type="application/rss+xml" title="X" href="/feed?a=1&amp;b=2">
      <link href='https://x.nl/atom.xml' type='application/atom+xml' rel='alternate'></head>`;
    expect(vindFeedLinks(html, 'https://x.nl/nieuws/')).toEqual(['https://x.nl/feed?a=1&b=2', 'https://x.nl/atom.xml']);
  });
  it('herkent een feed', () => {
    expect(lijktFeed('<?xml version="1.0"?>\n<!-- c --><rss version="2.0">')).toBe(true);
    expect(lijktFeed('<feed xmlns="http://www.w3.org/2005/Atom">')).toBe(true);
    expect(lijktFeed('<!doctype html><html>')).toBe(false);
  });
});
