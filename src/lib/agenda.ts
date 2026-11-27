// Agenda en Uitagenda: periodes, zoeken en persoonlijke keuzes. Pure functies, getest.
import type { Evenement, EvenementCategorie } from './finance-agenda-types';

export const CATEGORIE_NAAM: Record<EvenementCategorie, string> = {
  festival: 'Festivals', concert: 'Concerten', livemuziek: 'Livemuziek', theater: 'Theater', expositie: 'Exposities',
  'open-dag': 'Open dagen', markt: 'Markten', traditie: 'Tradities', wijkfeest: 'Wijkfeesten', film: 'Films',
  demonstratie: 'Demonstraties', verstoring: 'Verstoringen', overig: 'Overig',
};

export const LOCATIETYPE_NAAM: Record<string, string> = {
  kroeg: 'Kroeg', cafe: 'Café', 'klein-theater': 'Klein theater', podium: 'Podium', museum: 'Museum', buiten: 'Buiten', bedrijf: 'Bedrijf', overig: 'Overig',
};

const dag = (iso: string) => iso.slice(0, 10);
const plusDagen = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

export type Periode = 'vandaag' | 'week' | 'maand';

/** Loopt het evenement (deels) in de periode vanaf vandaag? Meerdaagse evenementen tellen mee zolang ze lopen. */
export function inPeriode(e: Pick<Evenement, 'start' | 'eind'>, periode: Periode, vandaag: string): boolean {
  const tot = periode === 'vandaag' ? vandaag : plusDagen(vandaag, periode === 'week' ? 6 : 30);
  const start = dag(e.start);
  const eind = dag(e.eind ?? e.start);
  return start <= tot && eind >= vandaag;
}

/** Vandaag / Deze week / Later, voor de chronologische agenda. */
export function groep(e: Pick<Evenement, 'start' | 'eind'>, vandaag: string): 'vandaag' | 'week' | 'later' | 'voorbij' {
  if (dag(e.eind ?? e.start) < vandaag) return 'voorbij';
  if (inPeriode(e, 'vandaag', vandaag)) return 'vandaag';
  if (inPeriode(e, 'week', vandaag)) return 'week';
  return 'later';
}

export const normaal = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Doorzoekt titel, beschrijving, locatie, plaats, wijk, organisator, genre en zoektermen.
 *  Elk woord moet ergens voorkomen; deelwoorden tellen (haven → havendag). Score: titeltreffers eerst. */
export function zoekScore(e: Evenement, q: string): number {
  const woorden = normaal(q).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);
  if (!woorden.length) return 1;
  const titel = normaal(e.titel);
  const rest = normaal([e.beschrijving, e.locatie, e.plaats, e.wijk, e.organisator, e.genre, ...(e.zoektermen ?? [])].filter(Boolean).join(' '));
  let score = 0;
  for (const w of woorden) {
    if (titel.includes(w)) score += 3;
    else if (rest.includes(w)) score += 1;
    else return 0;
  }
  return score;
}

export type AgendaKeuze = { doelSoort: 'evenement' | 'categorie' | 'locatie'; doelId: string; actie: 'volgen' | 'verbergen' };

/** Specifieke keuzes gaan voor categorievoorkeuren (docs/AGENDA.md). */
export function agendaBeoordeel(e: Evenement, keuzes: AgendaKeuze[]): { zichtbaar: boolean; gevolgd: boolean; regel?: AgendaKeuze } {
  const ev = keuzes.find((k) => k.doelSoort === 'evenement' && (k.doelId === e.id || k.doelId === e.hoofdevenement));
  if (ev) return { zichtbaar: ev.actie === 'volgen', gevolgd: ev.actie === 'volgen', regel: ev };
  const loc = keuzes.find((k) => k.doelSoort === 'locatie' && k.doelId === e.locatie);
  if (loc) return { zichtbaar: loc.actie === 'volgen', gevolgd: loc.actie === 'volgen', regel: loc };
  const cat = keuzes.find((k) => k.doelSoort === 'categorie' && k.doelId === e.categorie);
  if (cat) return { zichtbaar: cat.actie === 'volgen', gevolgd: false, regel: cat };
  return { zichtbaar: true, gevolgd: false };
}
