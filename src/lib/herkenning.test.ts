import { describe, expect, it } from 'vitest';
import { herkenOnderwerpen, koppelVerhaal, patroon, taalVan } from './herkenning';

const ids = (x: { id: string }[]) => x.map((h) => h.id);

describe('patroon', () => {
  it('matcht aan het begin van een woord, zonder accenten', () => {
    expect(patroon('ziekenhuis').test('Druk in ziekenhuisopnames')).toBe(true);
    expect(patroon('ziekenhuis').test('kinderziekenhuis')).toBe(false);
    expect(patroon('Oekraïne').test('Oekraine krijgt lening')).toBe(true);
  });

  it('afkortingen en $-termen alleen als heel woord, hoofdlettergevoelig waar nodig', () => {
    expect(patroon('OM').test('OM eist tien jaar')).toBe(true);
    expect(patroon('OM').test('Om negen uur')).toBe(false);
    expect(patroon('AI').test('Nieuwe AI-modellen')).toBe(true);
    expect(patroon('AI').test('Dubai')).toBe(false);
    expect(patroon('vlucht$').test('Vluchtelingen in Ter Apel')).toBe(false);
    expect(patroon('vlucht$').test('Vlucht naar Bali geannuleerd')).toBe(true);
    expect(patroon('Meta$').test('Metaal')).toBe(false);
  });
});

describe('herkenOnderwerpen', () => {
  it('bronnen tellen altijd, een trefwoord in de kop telt', () => {
    const h = herkenOnderwerpen({ titel: 'Feyenoord verliest van PSV', samenvatting: '', reikwijdte: 'nederland', bronOnderwerpen: ['economie'] });
    expect(ids(h)).toEqual(['economie', 'sport']);
    expect(h[1]).toMatchObject({ via: 'trefwoord', term: 'PSV' });
  });

  it('één trefwoord in de samenvatting is te weinig', () => {
    expect(herkenOnderwerpen({ titel: 'Lange rij bij nieuwe winkel', samenvatting: 'Ook de politie keek even.', reikwijdte: 'nederland' })).toEqual([]);
  });

  it('feedcategorie telt sterk', () => {
    const h = herkenOnderwerpen({ titel: 'Kop zonder trefwoord', samenvatting: '', categorieen: ['Politiek Den Haag'], reikwijdte: 'nederland' });
    expect(h[0]).toMatchObject({ id: 'binnenland-politiek', via: 'categorie' });
  });

  it('binnenlandse politiek niet bij buitenlands nieuws', () => {
    const h = herkenOnderwerpen({ titel: 'Minister van Defensie in Duitsland treedt af', samenvatting: '', reikwijdte: 'wereld' });
    expect(ids(h)).not.toContain('binnenland-politiek');
  });

  it('herkent oorlog en internationale politiek', () => {
    const h = herkenOnderwerpen({ titel: 'Zelensky: Oekraïne wil wapenstilstand voor de winter', samenvatting: '', reikwijdte: 'wereld' });
    expect(ids(h)).toEqual(expect.arrayContaining(['oorlog-en-conflict', 'internationale-politiek']));
  });

  it('hoogstens drie onderwerpen', () => {
    const h = herkenOnderwerpen({ titel: 'Politie, rechter, ziekenhuis, Ajax en Nvidia in één kop over de economie', samenvatting: '', reikwijdte: 'nederland' });
    expect(h.length).toBeLessThanOrEqual(3);
  });
});

describe('koppelVerhaal', () => {
  const verhalen = [
    { id: 'nvidia', koppel: [['Nvidia'], ['Jensen Huang']] },
    { id: 'asml', koppel: [['ASML', 'China'], ['MATCH Act']] },
    { id: 'oekraine', koppel: [['Oekraïne'], ['Ukraine']] },
  ];

  it('koppelt als een groep volledig matcht en de kop een term bevat', () => {
    expect(koppelVerhaal({ titel: 'Nvidia verkoopt meer chips', samenvatting: '' }, verhalen)).toBe('nvidia');
    expect(koppelVerhaal({ titel: 'ASML mag minder naar China', samenvatting: '' }, verhalen)).toBe('asml');
  });

  it('koppelt niet op alleen de samenvatting', () => {
    expect(koppelVerhaal({ titel: 'Beurs daalt', samenvatting: 'Ook Nvidia lager.' }, verhalen)).toBeUndefined();
  });

  it('koppelt niet bij een halve groep', () => {
    expect(koppelVerhaal({ titel: 'ASML presenteert kwartaalcijfers', samenvatting: '' }, verhalen)).toBeUndefined();
  });

  it('koppelt niet bij twijfel tussen twee verhalen', () => {
    expect(koppelVerhaal({ titel: 'Nvidia-chips voor Oekraïne', samenvatting: '' }, verhalen)).toBeUndefined();
  });
});

describe('taalVan', () => {
  it('herkent Nederlands en Engels', () => {
    expect(taalVan('Kabinet zet alle middelen in om de wet tegen te houden')).toBe('nl');
    expect(taalVan('EU leaders push Ukraine loan to December as three of the states hold out')).toBe('en');
  });
});

describe('taalgebonden termen', () => {
  it('brand is vuur in het Nederlands, niet in het Engels', () => {
    expect(ids(herkenOnderwerpen({ titel: 'Gewonden bij brand in winkel Rotterdam', samenvatting: '', reikwijdte: 'nederland', taal: 'nl' }))).toContain('veiligheid');
    expect(ids(herkenOnderwerpen({ titel: 'Apple launches new brand campaign', samenvatting: '', reikwijdte: 'wereld', taal: 'en' }))).not.toContain('veiligheid');
  });
});
