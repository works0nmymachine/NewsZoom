// Van losse berichten naar kaarten: filterregels toepassen, scoren, hetzelfde nieuws bundelen en spreiden.
import { beoordeel, type Beoordeling, type Regel } from './filters';
import type { Item, Samengevoegd } from './inhoud';
import { bundel, score, spreid, uurOud } from './rangorde';

export type Kaart = { item: Item; ook: Item[]; b: Beoordeling; score: number; nieuwst: string };

const redactie = (i: Item) => i.uitgever ?? i.bron;

/**
 * Kaarten in volgorde van score. Breed = ook verborgen berichten (gedimd).
 * Een zoekterm negeert verberg-regels niet hier; dat doet de zoekpagina zelf.
 */
export function kaarten(items: Item[], regels: Regel[], nu: Date, { breed = false } = {}): Kaart[] {
  const beoordeeld = items.map((item) => ({ item, b: beoordeel(item, regels) })).filter((x) => breed || x.b.zichtbaar);
  const perId = new Map(beoordeeld.map((x) => [x.item.id, x]));
  const opScore = [...beoordeeld].sort((a, z) => score(z.item, z.b.gewicht, nu) - score(a.item, a.b.gewicht, nu));
  return bundel(opScore.map((x) => x.item)).map(({ hoofd, ook }) => {
    const b = perId.get(hoofd.id)!.b;
    const redacties = new Set(ook.map(redactie).filter((r) => r !== redactie(hoofd)));
    const nieuwst = [hoofd, ...ook].map((i) => i.gepubliceerd).sort().at(-1)!;
    return { item: hoofd, ook, b, score: score(hoofd, b.gewicht, nu, redacties.size), nieuwst };
  }).sort((a, z) => z.score - a.score);
}

/** De beste n kaarten, met spreiding over bronnen en hoogstens één kaart per verhaal. */
export function top(lijst: Kaart[], n: number): Kaart[] {
  const gespreid = spreid(lijst, (k) => k.score, (k) => [redactie(k.item)]);
  const verhalen = new Set<string>();
  const uit: Kaart[] = [];
  for (const k of gespreid) {
    if (k.item.verhaal && verhalen.has(k.item.verhaal)) continue;
    if (k.item.verhaal) verhalen.add(k.item.verhaal);
    uit.push(k);
    if (uit.length === n) break;
  }
  return uit;
}

/** Berichten jonger dan het aantal uren; is dat te weinig, dan de nieuwste die er zijn. */
export function recent(items: Item[], nu: Date, uren: number, minimaal: number): Item[] {
  const jong = items.filter((i) => uurOud(i.gepubliceerd, nu) <= uren);
  if (jong.length >= minimaal) return jong;
  return [...items].sort((a, b) => b.gepubliceerd.localeCompare(a.gepubliceerd)).slice(0, Math.max(minimaal, jong.length));
}

/** Korte, concrete reden waarom een kaart er staat. */
export function reden(k: Kaart, inhoud: Samengevoegd): string | null {
  const d = k.b.doorslaggevend;
  if (d && d.actie === 'meer') {
    const naam = d.doelSoort === 'verhaal' ? inhoud.verhalen.get(d.doelId)?.titel : d.doelSoort === 'onderwerp' ? inhoud.onderwerpen.get(d.doelId)?.naam : inhoud.bronnen.get(d.doelId)?.naam;
    return `Je volgt ${naam ?? d.doelId}`;
  }
  const bronnen = new Set([redactie(k.item), ...k.ook.map(redactie)]).size;
  if (bronnen >= 3) return `Bij ${bronnen} bronnen`;
  if (k.item.belang >= 3) return 'Belangrijke ontwikkeling';
  return null;
}

/** Groepeert kaarten per kalenderdag (Europe/Amsterdam), nieuwste dag eerst. */
export function perDag(lijst: Kaart[], nu: Date): { dag: string; naam: string; kaarten: Kaart[] }[] {
  const fmt = new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' });
  const naamFmt = new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', weekday: 'long', day: 'numeric', month: 'long' });
  const vandaag = fmt.format(nu);
  const gisteren = fmt.format(new Date(nu.getTime() - 86_400_000));
  const groepen = new Map<string, Kaart[]>();
  for (const k of [...lijst].sort((a, z) => z.nieuwst.localeCompare(a.nieuwst))) {
    const dag = fmt.format(new Date(k.nieuwst));
    groepen.set(dag, [...(groepen.get(dag) ?? []), k]);
  }
  return [...groepen.entries()].map(([dag, kaarten]) => ({
    dag,
    naam: dag === vandaag ? 'Vandaag' : dag === gisteren ? 'Gisteren' : naamFmt.format(new Date(kaarten[0].nieuwst)),
    kaarten,
  }));
}
