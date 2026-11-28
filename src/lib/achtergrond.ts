import 'server-only';
import { pool } from './db';
import type { Item, Samengevoegd } from './inhoud';
import type { Laag, Verhaal } from './inhoud-types';

export type AutoLink = { titel: string; url: string; bron: string; datum: string };
export type AutoInhoud = {
  titel: string;
  laatsteOntwikkeling: string;
  watVerandert?: { tekst: string; onzeker: string };
  partijen: { naam: string; belang: string }[];
  dossier: Record<'kort' | 'dezeWeek' | 'afgelopenMaanden' | 'vanafBegin', { tekst: string; bronnen: AutoLink[] }>;
  weggelatenLinks?: number;
};

export type AutoAchtergrond = {
  sleutel: string;
  status: 'wachtend' | 'bezig' | 'klaar' | 'mislukt';
  inhoud: AutoInhoud | null;
  provider: string | null;
  model: string | null;
  kosten_usd: string | null;
  fout: string | null;
  aangevraagd_at: Date;
  klaar_at: Date | null;
};

export async function autoAchtergrond(sleutel: string): Promise<AutoAchtergrond | null> {
  try {
    const { rows } = await pool().query(`SELECT * FROM nz_achtergronden WHERE sleutel = $1`, [sleutel]);
    return rows[0] ?? null;
  } catch {
    return null; // migratie nog niet gedraaid
  }
}

/** Zet de automatische lagen om naar de vorm van een handmatig dossier. De bron is hier een naam, geen id. */
export function alsDossier(a: AutoInhoud): NonNullable<Verhaal['dossier']> {
  const laag = (l: AutoInhoud['dossier']['kort']): Laag => ({ tekst: l.tekst, bronnen: l.bronnen });
  return { kort: laag(a.dossier.kort), dezeWeek: laag(a.dossier.dezeWeek), afgelopenMaanden: laag(a.dossier.afgelopenMaanden), vanafBegin: laag(a.dossier.vanafBegin) };
}

const bericht = (i: Item, inhoud: Samengevoegd) => ({
  datum: i.gepubliceerd.slice(0, 10), bron: inhoud.bronnen.get(i.bron)?.naam ?? i.bron, titel: i.titel, url: i.url, samenvatting: i.samenvatting,
});

/** Invoer voor de generator, altijd op de server samengesteld uit eigen gegevens. */
export function invoerVoorVerhaal(v: Verhaal, inhoud: Samengevoegd) {
  const berichten = inhoud.items.filter((i) => i.verhaal === v.id).sort((a, b) => b.gepubliceerd.localeCompare(a.gepubliceerd)).slice(0, 15);
  return {
    soort: 'verhaal', titel: v.titel, laatsteOntwikkeling: v.laatsteOntwikkeling, watVerandert: v.watVerandert?.tekst,
    berichten: berichten.map((i) => bericht(i, inhoud)),
  };
}

export function invoerVoorBericht(i: Item, inhoud: Samengevoegd) {
  return { soort: 'bericht', titel: i.titel, berichten: [bericht(i, inhoud)] };
}

export const aiBeschikbaar = () => !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
