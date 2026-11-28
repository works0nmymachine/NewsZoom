import { describe, expect, it } from 'vitest';
import { bundel, score, spreid, versheid, zelfdeNieuws, type Rangbaar } from './rangorde';

const nu = new Date('2026-11-28T09:00:00Z');
const uurGeleden = (u: number) => new Date(nu.getTime() - u * 3_600_000).toISOString();
const item = (x: Partial<Rangbaar>): Rangbaar => ({
  id: x.id ?? 'x', bron: 'nos', titel: 'Kop', url: `https://a.nl/${x.id ?? 'x'}`, gepubliceerd: uurGeleden(1), belang: 1, ...x,
});

describe('versheid en score', () => {
  it('halveert na 18 uur', () => {
    expect(versheid(uurGeleden(0), nu)).toBe(1);
    expect(versheid(uurGeleden(18), nu)).toBeCloseTo(0.5);
  });

  it('een vers feedbericht wint van een belangrijk bericht van anderhalve dag oud', () => {
    const oudBelangrijk = score({ belang: 3, gepubliceerd: uurGeleden(36) }, 0, nu);
    const versGewoon = score({ belang: 1, gepubliceerd: uurGeleden(2) }, 0, nu);
    expect(versGewoon).toBeGreaterThan(oudBelangrijk);
  });

  it('Minder hiervan zet een bericht onderaan, Meer hiervan tilt het op', () => {
    const gewoon = score({ belang: 1, gepubliceerd: uurGeleden(1) }, 0, nu);
    expect(score({ belang: 1, gepubliceerd: uurGeleden(1) }, -2, nu)).toBeLessThan(gewoon / 5);
    expect(score({ belang: 1, gepubliceerd: uurGeleden(1) }, 2, nu)).toBeGreaterThan(gewoon);
  });

  it('meer bronnen over hetzelfde nieuws telt mee, begrensd', () => {
    const een = score({ belang: 1, gepubliceerd: uurGeleden(1) }, 0, nu, 0);
    expect(score({ belang: 1, gepubliceerd: uurGeleden(1) }, 0, nu, 2)).toBeGreaterThan(een);
    expect(score({ belang: 1, gepubliceerd: uurGeleden(1) }, 0, nu, 10)).toBe(score({ belang: 1, gepubliceerd: uurGeleden(1) }, 0, nu, 4));
  });
});

describe('zelfdeNieuws en bundel', () => {
  const nos = item({ id: 'a', bron: 'nos', titel: 'Brandweer begint met blussen van broeiende silo in Drachten' });
  const nu_ = item({ id: 'b', bron: 'nu-nl', titel: 'Brandweer begint voorzichtig met blussen van silo Drachten' });
  const anders = item({ id: 'c', bron: 'ad', titel: 'Silo in Groningen gesloopt na jaren leegstand' });

  it('herkent dezelfde kop bij een andere bron', () => {
    expect(zelfdeNieuws(nos, nu_)).toBe(true);
    expect(zelfdeNieuws(nos, anders)).toBe(false);
  });

  it('niet samen als de tijd te ver uiteen ligt', () => {
    expect(zelfdeNieuws(nos, { ...nu_, gepubliceerd: uurGeleden(60) })).toBe(false);
  });

  it('zelfde adres is altijd hetzelfde', () => {
    expect(zelfdeNieuws(item({ url: 'https://www.a.nl/x?utm=1' }), item({ url: 'http://a.nl/x/', titel: 'Iets heel anders' }))).toBe(true);
  });

  it('bundelt onder het eerste bericht en niet twee keer dezelfde bron', () => {
    const nosDubbel = item({ id: 'd', bron: 'nos', titel: 'Brandweer begint met blussen van broeiende silo in Drachten, omgeving ontruimd' });
    const b = bundel([nos, nu_, anders, nosDubbel]);
    expect(b.map((x) => x.hoofd.id)).toEqual(['a', 'c', 'd']);
    expect(b[0].ook.map((x) => x.id)).toEqual(['b']);
  });
});

describe('spreid', () => {
  it('voorkomt dat één bron bovenaan alles vult', () => {
    const lijst = [
      { id: 1, bron: 'a', s: 10 }, { id: 2, bron: 'a', s: 9 }, { id: 3, bron: 'a', s: 8 }, { id: 4, bron: 'b', s: 7 }, { id: 5, bron: 'c', s: 6 },
    ];
    const uit = spreid(lijst, (x) => x.s, (x) => [x.bron]);
    expect(uit.slice(0, 3).map((x) => x.bron)).toEqual(['a', 'b', 'c']);
    expect(uit).toHaveLength(5);
  });
});
