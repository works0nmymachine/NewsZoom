import type { Regel } from './filters';
import type { Samengevoegd } from './inhoud';

const TZ = 'Europe/Amsterdam';
const dagFmt = new Intl.DateTimeFormat('nl-NL', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const tijdFmt = new Intl.DateTimeFormat('nl-NL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const kortFmt = new Intl.DateTimeFormat('nl-NL', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
const langFmt = new Intl.DateTimeFormat('nl-NL', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const dagSleutel = (d: Date) => dagFmt.format(d);

export function wanneer(iso: string, nu = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const gisteren = new Date(nu.getTime() - 86400000);
  if (dagSleutel(d) === dagSleutel(nu)) return `vandaag ${tijdFmt.format(d)}`;
  if (dagSleutel(d) === dagSleutel(gisteren)) return `gisteren ${tijdFmt.format(d)}`;
  return /T/.test(iso) ? `${kortFmt.format(d)} ${tijdFmt.format(d)}` : kortFmt.format(d);
}

export const datumLang = (iso: string | Date) => langFmt.format(typeof iso === 'string' ? new Date(iso) : iso);
export const datumKort = (iso: string) => kortFmt.format(new Date(iso));

export const ACTIE_NAAM = { meer: 'Meer hiervan', minder: 'Minder hiervan', verbergen: 'Verbergen' } as const;
const SOORT_NAAM = { verhaal: 'het verhaal', onderwerp: 'het onderwerp', bron: 'de bron' } as const;

export function doelNaam(r: Pick<Regel, 'doelSoort' | 'doelId'>, inhoud: Samengevoegd): string {
  if (r.doelSoort === 'verhaal') return inhoud.verhalen.get(r.doelId)?.titel ?? r.doelId;
  if (r.doelSoort === 'onderwerp') return inhoud.onderwerpen.get(r.doelId)?.naam ?? r.doelId;
  return inhoud.bronnen.get(r.doelId)?.naam ?? r.doelId;
}

export function beschrijfRegel(r: Regel, inhoud: Samengevoegd): string {
  const wat = `${SOORT_NAAM[r.doelSoort]} ${doelNaam(r, inhoud)}`;
  if (r.actie === 'meer') return `Je volgt ${wat} (Meer hiervan).`;
  if (r.actie === 'minder') return `Je wilt minder van ${wat}.`;
  return `Je hebt ${wat} verborgen.`;
}

export function alineas(tekst: string): string[] {
  return tekst.split(/\n\s*\n/).map((a) => a.trim()).filter(Boolean);
}
