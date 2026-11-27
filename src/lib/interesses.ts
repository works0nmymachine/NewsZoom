// Eigen interesses: een naam plus zoektermen en uitsluitingen. Pure functies, getest.
export type Interesse = { id: number; naam: string; zoektermen: string[]; uitsluitingen: string[]; gedempt: boolean };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const woord = (term: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${escape(term.trim())}`, 'iu');

/** Splitst invoer op komma's of nieuwe regels; leeg en dubbel eruit. */
export function termen(invoer: string): string[] {
  const gezien = new Set<string>();
  return invoer.split(/[,\n]/).map((t) => t.trim()).filter((t) => t.length > 1 && t.length <= 60)
    .filter((t) => (gezien.has(t.toLowerCase()) ? false : (gezien.add(t.toLowerCase()), true))).slice(0, 20);
}

/** Past de tekst bij de interesse? Een term matcht aan het begin van een woord (haven → havendag). */
export function past(tekst: string, i: Pick<Interesse, 'naam' | 'zoektermen' | 'uitsluitingen'>): boolean {
  const zoek = i.zoektermen.length ? i.zoektermen : [i.naam];
  if (!zoek.some((t) => woord(t).test(tekst))) return false;
  return !i.uitsluitingen.some((t) => woord(t).test(tekst));
}
