import { describe, expect, it } from 'vitest';
import { beoordeel, gevolgd, type Regel } from './filters';

let n = 0;
const r = (doelSoort: Regel['doelSoort'], doelId: string, actie: Regel['actie']): Regel => ({ id: ++n, doelSoort, doelId, actie });
const eurovisieUitgaven = { verhaal: 'eurovisie', onderwerpen: ['cultuur', 'gemeentepolitiek'], bron: 'parool' };

describe('beoordeel', () => {
  it('zonder regels: zichtbaar, neutraal', () => {
    expect(beoordeel(eurovisieUitgaven, [])).toEqual({ zichtbaar: true, gewicht: 0, doorslaggevend: null, toegepast: [] });
  });

  it('cultuur volgen maar Eurovisie verbergen: het verhaal gaat voor', () => {
    const verberg = r('verhaal', 'eurovisie', 'verbergen');
    const b = beoordeel(eurovisieUitgaven, [r('onderwerp', 'cultuur', 'meer'), verberg]);
    expect(b.zichtbaar).toBe(false);
    expect(b.doorslaggevend).toBe(verberg);
  });

  it('verhaal volgen terwijl het onderwerp verborgen is', () => {
    const volg = r('verhaal', 'eurovisie', 'meer');
    const b = beoordeel(eurovisieUitgaven, [r('onderwerp', 'cultuur', 'verbergen'), volg]);
    expect(b).toMatchObject({ zichtbaar: true, gewicht: 2, doorslaggevend: volg });
  });

  it('verbergen gaat voor meer bij tegenstrijdige onderwerpregels', () => {
    const verberg = r('onderwerp', 'gemeentepolitiek', 'verbergen');
    const b = beoordeel(eurovisieUitgaven, [r('onderwerp', 'cultuur', 'meer'), verberg]);
    expect(b).toMatchObject({ zichtbaar: false, doorslaggevend: verberg });
  });

  it('een verborgen bron blijft verborgen, ook bij een gevolgd verhaal', () => {
    const bron = r('bron', 'parool', 'verbergen');
    const b = beoordeel(eurovisieUitgaven, [r('verhaal', 'eurovisie', 'meer'), bron]);
    expect(b).toMatchObject({ zichtbaar: false, doorslaggevend: bron });
  });

  it('meer en minder op verschillende onderwerpen heffen elkaar op', () => {
    const b = beoordeel(eurovisieUitgaven, [r('onderwerp', 'cultuur', 'meer'), r('onderwerp', 'gemeentepolitiek', 'minder')]);
    expect(b).toMatchObject({ zichtbaar: true, gewicht: 0 });
  });

  it('minder hiervan verlaagt alleen de prioriteit', () => {
    const minder = r('onderwerp', 'cultuur', 'minder');
    expect(beoordeel(eurovisieUitgaven, [minder])).toMatchObject({ zichtbaar: true, gewicht: -2, doorslaggevend: minder });
  });
});

describe('gevolgd', () => {
  it('volgen via onderwerp of verhaal, niet bij verborgen', () => {
    expect(gevolgd(eurovisieUitgaven, [r('onderwerp', 'cultuur', 'meer')])).toBe(true);
    expect(gevolgd(eurovisieUitgaven, [r('onderwerp', 'cultuur', 'meer'), r('verhaal', 'eurovisie', 'verbergen')])).toBe(false);
    expect(gevolgd(eurovisieUitgaven, [])).toBe(false);
  });
});
