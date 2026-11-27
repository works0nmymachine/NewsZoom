import { describe, expect, it } from 'vitest';
import { meet, procent, rendement, zoneTijd } from './koersmeting';

const nvda = [
  { datum: '2026-11-13', slot: 162.85 }, { datum: '2026-11-16', slot: 156.14 }, { datum: '2026-11-17', slot: 155.46 },
  { datum: '2026-11-18', slot: 150.96 }, { datum: '2026-11-19', slot: 145.98 }, { datum: '2026-11-20', slot: 125.53 },
  { datum: '2026-11-23', slot: 165.05 }, { datum: '2026-11-24', slot: 155.38 }, { datum: '2026-11-25', slot: 149.3 },
];
const aandeel = { soort: 'aandeel' as const };

describe('zoneTijd', () => {
  it('rekent New Yorkse tijd om, met wintertijd', () => {
    expect(zoneTijd('2026-11-17', '16:00', 'America/New_York').toISOString()).toBe('2026-11-17T21:00:00.000Z');
    expect(zoneTijd('2026-07-01', '16:00', 'America/New_York').toISOString()).toBe('2026-07-01T20:00:00.000Z');
  });
});

describe('meet', () => {
  it('cijfers na beurssluiting: referentie is de slot van die dag, venster begint de volgende sessie', () => {
    const m = meet(nvda, '2026-11-17T16:20:00-05:00', '1d', aandeel);
    expect(m).toMatchObject({ beschikbaar: true, referentie: { datum: '2026-11-17' }, eind: { datum: '2026-11-18' } });
    if (m.beschikbaar) expect(m.procent).toBeCloseTo((150.96 / 155.46 - 1) * 100, 6);
  });

  it('nieuws vóór de opening: de openingssprong telt mee', () => {
    const m = meet(nvda, '2026-11-23T08:00:00-05:00', '1d', aandeel);
    expect(m).toMatchObject({ beschikbaar: true, referentie: { datum: '2026-11-20' }, eind: { datum: '2026-11-23' } });
    if (m.beschikbaar) expect(procent(m.procent)).toBe('+31,5%');
  });

  it('tijdens de sessie: venster eindigt bij de slot van dezelfde dag', () => {
    expect(meet(nvda, '2026-11-18T12:00:00-05:00', '1d', aandeel)).toMatchObject({ referentie: { datum: '2026-11-17' }, eind: { datum: '2026-11-18' } });
  });

  it('vijf handelsdagen slaat het weekend over', () => {
    expect(meet(nvda, '2026-11-16T20:00:00-05:00', '5d', aandeel)).toMatchObject({ eind: { datum: '2026-11-23' } });
  });

  it('nog niet beschikbaar als het venster niet voorbij is', () => {
    expect(meet(nvda, '2026-11-24T12:00:00-05:00', '5d', aandeel)).toMatchObject({ beschikbaar: false });
  });

  it('crypto: 24 uur op basis van dagkoersen is een benadering', () => {
    const btc = [{ datum: '2026-11-20', slot: 100 }, { datum: '2026-11-21', slot: 90 }, { datum: '2026-11-22', slot: 95 }];
    const m = meet(btc, '2026-11-20T10:00:00Z', '24u', { soort: 'crypto' });
    expect(m).toMatchObject({ beschikbaar: true, referentie: { datum: '2026-11-20' }, eind: { datum: '2026-11-22' }, benadering: true });
  });
});

describe('rendement', () => {
  it('weekrendement van slot vorige week tot slot vrijdag', () => {
    expect(procent(rendement(nvda, '2026-11-16', '2026-11-20')!)).toBe('−22,9%');
  });
});
