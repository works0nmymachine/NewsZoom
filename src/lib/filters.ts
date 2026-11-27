// Filterregels uit het functioneel ontwerp ("Als regels botsen"):
// 1. Een verborgen bron blijft altijd buiten de gefilterde weergave.
// 2. Een regel voor een specifiek verhaal gaat voor op regels voor onderwerpen.
// 3. Bij tegenstrijdige onderwerpregels gaat Verbergen voor Meer en Minder.
// 4. Meer en Minder veranderen alleen de volgorde; een leesklik verandert niets.

export type Actie = 'meer' | 'minder' | 'verbergen';
export type DoelSoort = 'verhaal' | 'onderwerp' | 'bron';
export type Regel = { id: number; doelSoort: DoelSoort; doelId: string; actie: Actie };

export type Beoordeelbaar = { verhaal?: string; onderwerpen: string[]; bron: string };

export type Beoordeling = {
  zichtbaar: boolean;
  gewicht: number; // -2..+4, telt op bij het belang
  doorslaggevend: Regel | null; // de regel die de uitkomst bepaalt
  toegepast: Regel[]; // alle regels die op dit item slaan
};

const GEWICHT: Record<Exclude<Actie, 'verbergen'>, number> = { meer: 2, minder: -2 };

export function beoordeel(item: Beoordeelbaar, regels: Regel[]): Beoordeling {
  const bron = regels.find((r) => r.doelSoort === 'bron' && r.doelId === item.bron);
  const verhaal = item.verhaal ? regels.find((r) => r.doelSoort === 'verhaal' && r.doelId === item.verhaal) : undefined;
  const onderwerp = regels.filter((r) => r.doelSoort === 'onderwerp' && item.onderwerpen.includes(r.doelId));
  const toegepast = [bron, verhaal, ...onderwerp].filter((r): r is Regel => !!r);

  if (bron?.actie === 'verbergen') return { zichtbaar: false, gewicht: 0, doorslaggevend: bron, toegepast };
  const bronGewicht = bron ? GEWICHT[bron.actie as 'meer' | 'minder'] : 0;

  if (verhaal) {
    if (verhaal.actie === 'verbergen') return { zichtbaar: false, gewicht: 0, doorslaggevend: verhaal, toegepast };
    return { zichtbaar: true, gewicht: GEWICHT[verhaal.actie] + bronGewicht, doorslaggevend: verhaal, toegepast };
  }

  const verborgen = onderwerp.find((r) => r.actie === 'verbergen');
  if (verborgen) return { zichtbaar: false, gewicht: 0, doorslaggevend: verborgen, toegepast };

  // Meer en Minder op verschillende onderwerpen: de sterkste telt; gelijk opgeheven.
  const som = onderwerp.reduce((s, r) => s + GEWICHT[r.actie as 'meer' | 'minder'], 0);
  const onderwerpGewicht = Math.max(-2, Math.min(2, som));
  const doorslag =
    onderwerpGewicht > 0 ? onderwerp.find((r) => r.actie === 'meer')
    : onderwerpGewicht < 0 ? onderwerp.find((r) => r.actie === 'minder')
    : bron ?? null;
  return { zichtbaar: true, gewicht: onderwerpGewicht + bronGewicht, doorslaggevend: doorslag ?? bron ?? null, toegepast };
}

/** Volgt de gebruiker dit (Meer hiervan op verhaal, onderwerp of bron)? Bepaalt Mijn Nieuws. */
export function gevolgd(item: Beoordeelbaar, regels: Regel[]): boolean {
  const b = beoordeel(item, regels);
  return b.zichtbaar && b.toegepast.some((r) => r.actie === 'meer') && b.gewicht > 0;
}

export function sorteer<T extends { belang: number; gepubliceerd: string }>(
  items: T[], gewicht: (t: T) => number,
): T[] {
  return [...items].sort((a, b) => {
    const s = b.belang + gewicht(b) - (a.belang + gewicht(a));
    return s !== 0 ? s : b.gepubliceerd.localeCompare(a.gepubliceerd);
  });
}
