// Koerswijziging na een nieuwsbericht (docs/FINANCE.md):
// - Referentie: de laatst beschikbare koers vóór publicatie.
// - Aandelen: venster van 1 of 5 handelsdagen. Bij nieuws buiten beursuren begint het venster bij de
//   eerstvolgende sessie; een openingssprong telt dus mee. Een slotkoers geldt op 16:00 New Yorkse tijd.
// - Crypto handelt doorlopend: 24 uur of 7 dagen. Met dagkoersen (00:00 UTC) is dat een benadering.
// - Wijziging = (eindkoers / referentiekoers − 1) × 100%.

export type Koers = { datum: string; slot: number };
export type Venster = '1d' | '5d' | '24u' | '7d';

export type Meting =
  | { beschikbaar: true; referentie: Koers; eind: Koers; procent: number; venster: Venster; benadering: boolean }
  | { beschikbaar: false; reden: string; venster: Venster; referentie?: Koers };

/** Tijdstip van een wandkloktijd in een tijdzone, als Date (UTC). */
export function zoneTijd(datum: string, tijd: string, tijdzone: string): Date {
  const naief = new Date(`${datum}T${tijd}:00Z`);
  const delen = new Intl.DateTimeFormat('en-US', {
    timeZone: tijdzone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(naief);
  const v = (t: string) => Number(delen.find((p) => p.type === t)?.value);
  const alsUtc = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'));
  return new Date(naief.getTime() - (alsUtc - naief.getTime()));
}

const slotMoment = (k: Koers, soort: 'aandeel' | 'crypto', tijdzone: string) =>
  soort === 'aandeel' ? zoneTijd(k.datum, '16:00', tijdzone) : new Date(`${k.datum}T00:00:00Z`);

export function meet(
  koersen: Koers[], publicatie: string, venster: Venster,
  { soort, tijdzone = 'America/New_York' }: { soort: 'aandeel' | 'crypto'; tijdzone?: string },
): Meting {
  const pub = new Date(publicatie);
  const momenten = koersen.map((k) => ({ k, t: slotMoment(k, soort, tijdzone) }));
  const voor = momenten.filter((m) => m.t <= pub);
  const na = momenten.filter((m) => m.t > pub);
  const referentie = voor.at(-1)?.k;
  if (!referentie) return { beschikbaar: false, reden: 'Geen koers van vóór de publicatie.', venster };

  let eind: Koers | undefined;
  if (soort === 'aandeel') {
    const n = venster === '5d' ? 5 : 1;
    eind = na[n - 1]?.k;
  } else {
    const doel = new Date(pub.getTime() + (venster === '7d' ? 7 : 1) * 86400000);
    eind = momenten.find((m) => m.t >= doel)?.k;
  }
  if (!eind) return { beschikbaar: false, reden: 'Nog niet beschikbaar: het meetvenster is nog niet voorbij.', venster, referentie };
  const procent = (eind.slot / referentie.slot - 1) * 100;
  return { beschikbaar: true, referentie, eind, procent, venster, benadering: soort === 'crypto' };
}

export function rendement(koersen: Koers[], van: string, tot: string): number | null {
  const a = koersen.filter((k) => k.datum < van).at(-1);
  const b = koersen.filter((k) => k.datum <= tot).at(-1);
  return a && b ? (b.slot / a.slot - 1) * 100 : null;
}

const pctFmt = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1, minimumFractionDigits: 1, signDisplay: 'always' });
export const procent = (p: number) => `${pctFmt.format(p)}%`.replace('-', '−');

export const VENSTER_NAAM: Record<Venster, string> = {
  '1d': 'na één handelsdag', '5d': 'na vijf handelsdagen', '24u': 'na 24 uur', '7d': 'na zeven dagen',
};
