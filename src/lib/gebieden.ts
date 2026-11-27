// Lokale gebieden. Een wijk erft de bronnen van de stad en toont berichten die de wijk noemen.
export type Gebied = { id: string; naam: string; ouder?: string; zoektermen?: string[]; wijkbronnen?: string[] };

export const GEBIEDEN: Gebied[] = [
  { id: 'amsterdam', naam: 'Amsterdam' },
  { id: 'amsterdam-noord', naam: 'Amsterdam-Noord', ouder: 'amsterdam', zoektermen: ['Noord', 'Buiksloterham', 'Overhoeks', 'NDSM', 'Buikslotermeer', 'Banne', 'Tuindorp Oostzaan', 'IJplein'], wijkbronnen: ['rodi-amsterdam-noord'] },
  { id: 'amsterdam-nieuw-west', naam: 'Amsterdam Nieuw-West', ouder: 'amsterdam', zoektermen: ['Nieuw-West', 'Osdorp', 'Slotervaart', 'Geuzenveld', 'Slotermeer', 'De Aker', 'Sloten', 'Lelylaan'], wijkbronnen: ['westerpost'] },
  { id: 'weesp', naam: 'Weesp', ouder: 'amsterdam', zoektermen: ['Weesp', 'Driemond'], wijkbronnen: ['weespernieuws'] },
];

export const gebiedVan = (id: string | undefined) => GEBIEDEN.find((g) => g.id === id) ?? GEBIEDEN[0];

/** Noemt de tekst de wijk? Hele woorden, hoofdletterongevoelig. */
export function noemtGebied(tekst: string, g: Gebied): boolean {
  if (!g.zoektermen) return true;
  return g.zoektermen.some((z) => new RegExp(`(^|[^\\p{L}])${z.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu').test(tekst));
}
