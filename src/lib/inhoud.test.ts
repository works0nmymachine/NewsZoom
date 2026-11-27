import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Controleert de voorbeeldset in data/mvp: unieke ids, geldige verwijzingen, https-links en datums.
const map = path.join(process.cwd(), 'data', 'mvp');
const bestanden = (() => { try { return readdirSync(map).filter((f) => f.endsWith('.json')); } catch { return []; } })();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const delen: Record<string, any> = Object.fromEntries(bestanden.map((f) => [f, JSON.parse(readFileSync(path.join(map, f), 'utf8'))]));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const alle = (k: string): any[] => Object.values(delen).flatMap((d) => d[k] ?? []);
const isoMetTijd = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const datum = /^\d{4}-\d{2}-\d{2}$/;

describe.skipIf(bestanden.length === 0)('voorbeeldset', () => {
  const bronIds = new Set(alle('bronnen').map((b) => b.id));
  const verhaalIds = new Set(alle('verhalen').map((v) => v.id));
  const onderwerpIds = new Set(alle('onderwerpen').map((o) => o.id));

  it('verhalen hebben unieke ids en bekende onderwerpen', () => {
    const ids = alle('verhalen').map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const v of alle('verhalen')) for (const o of v.onderwerpen) expect(onderwerpIds, `${v.id}: ${o}`).toContain(o);
  });

  it('berichten verwijzen naar bestaande verhalen en bronnen', () => {
    const berichten = alle('berichten').filter((b) => 'verhaal' in b);
    const ids = berichten.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of berichten) {
      expect(verhaalIds, b.id).toContain(b.verhaal);
      expect(bronIds, `${b.id}: ${b.bron}`).toContain(b.bron);
      expect(b.url, b.id).toMatch(/^https:\/\//);
      expect(b.gepubliceerd, b.id).toMatch(isoMetTijd);
      expect([1, 2, 3]).toContain(b.belang);
    }
  });

  it('bronlinks in dossiers zijn compleet', () => {
    for (const v of alle('verhalen')) {
      const links = [
        ...(v.watVerandert?.bronnen ?? []),
        ...Object.values(v.dossier ?? {}).flatMap((l) => (l as { bronnen: unknown[] }).bronnen),
        ...(v.correcties ?? []).map((c: { bron: unknown }) => c.bron),
      ] as { bron: string; url: string; datum: string }[];
      for (const l of links) {
        expect(bronIds, `${v.id}: ${l.bron}`).toContain(l.bron);
        expect(l.url, v.id).toMatch(/^https:\/\//);
        expect(l.datum, v.id).toMatch(datum);
      }
    }
  });
});
