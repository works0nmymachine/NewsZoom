import { describe, expect, it } from 'vitest';
import { agendaBeoordeel, groep, inPeriode, loopt, zoekScore } from './agenda';
import type { Evenement } from './finance-agenda-types';

const ev = (x: Partial<Evenement>): Evenement => ({
  id: 'x', titel: 'Iets', categorie: 'festival', start: '2026-12-12', locatie: 'Binnenstad', plaats: 'Deventer', land: 'Nederland',
  beschrijving: '', bron: { naam: 'b', url: 'https://b.nl' }, status: 'gepland', ...x,
});

describe('periodes', () => {
  it('meerdaagse evenementen tellen mee zolang ze lopen', () => {
    const alf = { start: '2026-11-26', eind: '2027-01-17' };
    expect(inPeriode(alf, 'vandaag', '2026-11-27')).toBe(true);
    expect(groep(alf, '2026-11-27')).toBe('vandaag');
  });
  it('deze week en later', () => {
    expect(groep({ start: '2026-12-02' }, '2026-11-27')).toBe('week');
    expect(groep({ start: '2026-12-12' }, '2026-11-27')).toBe('later');
    expect(groep({ start: '2026-11-20' }, '2026-11-27')).toBe('voorbij');
    expect(inPeriode({ start: '2026-12-12' }, 'maand', '2026-11-27')).toBe(true);
  });
});

describe('zoekScore', () => {
  const dickens = ev({ titel: 'Dickens Festijn', zoektermen: ['Charles Dickens', 'kerstmarkt'] });
  const haven = ev({ titel: 'Open Havendag', plaats: 'Den Helder', locatie: 'Willemsoord' });
  const schiphol = ev({ titel: 'Rondleiding achter de schermen', locatie: 'Schiphol', plaats: 'Haarlemmermeer' });
  it('vindt op naam, deelwoord, plaats en locatie', () => {
    expect(zoekScore(dickens, 'Dickens')).toBeGreaterThan(0);
    expect(zoekScore(dickens, 'Charles Dickens')).toBeGreaterThan(0);
    expect(zoekScore(haven, 'haven')).toBeGreaterThan(0);
    expect(zoekScore(haven, 'havendag')).toBeGreaterThan(0);
    expect(zoekScore(haven, 'haven Den Helder')).toBeGreaterThan(0);
    expect(zoekScore(schiphol, 'Schiphol')).toBeGreaterThan(0);
  });
  it('alle woorden moeten passen; accenten tellen niet', () => {
    expect(zoekScore(haven, 'haven Rotterdam')).toBe(0);
    expect(zoekScore(ev({ titel: 'Café Alto' }), 'cafe')).toBeGreaterThan(0);
  });
  it('titeltreffers wegen zwaarder', () => {
    expect(zoekScore(haven, 'haven')).toBeGreaterThan(zoekScore(ev({ beschrijving: 'bij de haven' }), 'haven'));
  });
});

describe('agendaBeoordeel', () => {
  const fest = ev({ id: 'dickens', categorie: 'festival' });
  it('een festival volgen terwijl de categorie uitstaat', () => {
    const r = agendaBeoordeel(fest, [{ doelSoort: 'categorie', doelId: 'festival', actie: 'verbergen' }, { doelSoort: 'evenement', doelId: 'dickens', actie: 'volgen' }]);
    expect(r).toMatchObject({ zichtbaar: true, gevolgd: true });
  });
  it('een festival verbergen terwijl de categorie aanstaat', () => {
    expect(agendaBeoordeel(fest, [{ doelSoort: 'categorie', doelId: 'festival', actie: 'volgen' }, { doelSoort: 'evenement', doelId: 'dickens', actie: 'verbergen' }]).zichtbaar).toBe(false);
  });
  it('een keuze voor het hoofdevenement geldt voor onderdelen', () => {
    expect(agendaBeoordeel(ev({ id: 'optocht', hoofdevenement: 'dickens' }), [{ doelSoort: 'evenement', doelId: 'dickens', actie: 'verbergen' }]).zichtbaar).toBe(false);
  });
});

describe('loopt', () => {
  it('lopende tentoonstelling wel, nieuw evenement en verstoring niet', () => {
    expect(loopt({ start: '2026-09-11', eind: '2027-01-17', categorie: 'expositie' }, '2026-11-28')).toBe(true);
    expect(loopt({ start: '2026-11-28', eind: '2026-11-30', categorie: 'festival' }, '2026-11-28')).toBe(false);
    expect(loopt({ start: '2026-11-01', eind: '2026-12-31', categorie: 'verstoring' }, '2026-11-28')).toBe(false);
  });
});
