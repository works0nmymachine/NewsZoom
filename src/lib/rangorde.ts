// Volgorde van berichten: belang en persoonlijke regels, met tijdsverval, bundeling van hetzelfde
// nieuws uit meerdere bronnen en spreiding over bronnen en verhalen. Pure functies, getest.
import { zonderAccenten } from './herkenning';

/** Na zoveel uur telt een bericht nog half zo zwaar. */
export const HALFWAARDE_UUR = 18;

export type Rangbaar = {
  id: string; bron: string; uitgever?: string; verhaal?: string; titel: string; url: string; gepubliceerd: string; belang: number;
};

const redactie = (x: Rangbaar) => x.uitgever ?? x.bron;

export function uurOud(iso: string, nu: Date): number {
  return Math.max(0, (nu.getTime() - new Date(iso).getTime()) / 3_600_000);
}

export function versheid(iso: string, nu: Date): number {
  return 0.5 ** (uurOud(iso, nu) / HALFWAARDE_UUR);
}

/**
 * Score: (belang + persoonlijk gewicht + 1 + bonus voor extra bronnen) × versheid.
 * Minder hiervan (−2) zet een gewoon bericht vrijwel onderaan; Meer hiervan (+2) tilt het op.
 */
export function score(item: Pick<Rangbaar, 'belang' | 'gepubliceerd'>, gewicht: number, nu: Date, extraBronnen = 0): number {
  const basis = Math.max(0.1, item.belang + gewicht + 1 + Math.min(2, 0.5 * extraBronnen));
  return basis * versheid(item.gepubliceerd, nu);
}

const STOP = new Set([
  'de', 'het', 'een', 'van', 'en', 'in', 'op', 'met', 'voor', 'naar', 'bij', 'door', 'over', 'uit', 'om', 'aan', 'als', 'niet', 'nog',
  'wordt', 'worden', 'zijn', 'is', 'was', 'heeft', 'hebben', 'dat', 'die', 'dit', 'deze', 'ook', 'maar', 'meer', 'na', 'tot', 'te', 'er',
  'the', 'of', 'and', 'to', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'is', 'are', 'was', 'after', 'over', 'into', 'its', 'a', 'an',
  'nieuw', 'nieuwe', 'live', 'video', 'kijk', 'zo', 'wat', 'hoe', 'waarom', 'wie', 'says', 'said', 'zegt',
]);

/** Betekenisvolle woorden uit een kop: zonder accenten en stopwoorden, minstens 4 tekens of een getal. */
export function kernwoorden(kop: string): Set<string> {
  return new Set(zonderAccenten(kop).toLowerCase().split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && !STOP.has(w) && (w.length >= 4 || /\d{2,}/.test(w))));
}

const kaleUrl = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/$/, '');

/**
 * Gaat het om hetzelfde nieuws? Alleen bij sterk bewijs: zelfde adres, of binnen 36 uur minstens 3
 * gedeelde kernwoorden die samen 60% van de kortste kop vormen. Bij twijfel twee kaarten.
 */
export function zelfdeNieuws(a: Rangbaar, b: Rangbaar): boolean {
  if (kaleUrl(a.url) === kaleUrl(b.url)) return true;
  if (Math.abs(new Date(a.gepubliceerd).getTime() - new Date(b.gepubliceerd).getTime()) > 36 * 3_600_000) return false;
  const ka = kernwoorden(a.titel);
  const kb = kernwoorden(b.titel);
  let gedeeld = 0;
  for (const w of ka) if (kb.has(w)) gedeeld++;
  return gedeeld >= 3 && gedeeld / Math.min(ka.size, kb.size) >= 0.6;
}

export type Bundel<T> = { hoofd: T; ook: T[] };

/**
 * Bundelt in de gegeven volgorde: het eerste bericht wordt de kaart, latere gelijke berichten van een andere
 * redactie gaan eronder. Feeds van dezelfde redactie (NOS, NOS Sport) tellen als één bron.
 */
export function bundel<T extends Rangbaar>(items: T[]): Bundel<T>[] {
  const uit: Bundel<T>[] = [];
  for (const i of items) {
    const b = uit.find((x) => redactie(x.hoofd) !== redactie(i) && !x.ook.some((o) => redactie(o) === redactie(i)) && zelfdeNieuws(x.hoofd, i));
    if (b) b.ook.push(i);
    else uit.push({ hoofd: i, ook: [] });
  }
  return uit;
}

/**
 * Spreiding: kiest steeds het bericht met de hoogste score, waarbij elke eerdere keuze uit dezelfde
 * bron of hetzelfde verhaal de score met de factor verlaagt. Zo domineert geen enkele bron.
 */
export function spreid<T>(lijst: T[], scoreVan: (t: T) => number, sleutels: (t: T) => string[], factor = 0.6): T[] {
  const rest = lijst.map((t) => ({ t, s: scoreVan(t), k: sleutels(t) }));
  const gekozen = new Map<string, number>();
  const uit: T[] = [];
  while (rest.length) {
    let beste = 0;
    let besteScore = -Infinity;
    rest.forEach((x, n) => {
      const straf = x.k.reduce((p, k) => p * factor ** (gekozen.get(k) ?? 0), 1);
      if (x.s * straf > besteScore) { besteScore = x.s * straf; beste = n; }
    });
    const [x] = rest.splice(beste, 1);
    for (const k of x.k) gekozen.set(k, (gekozen.get(k) ?? 0) + 1);
    uit.push(x.t);
  }
  return uit;
}
