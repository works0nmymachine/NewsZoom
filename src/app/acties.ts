'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { pool } from '@/lib/db';
import type { Actie, DoelSoort } from '@/lib/filters';
import { ACTIES, DOEL_SOORTEN, wisRegel, zetRegel } from '@/lib/regels';
import { vereisGebruiker } from '@/lib/sessie';

/** Alleen interne paden als terugadres. */
function veiligTerug(waarde: FormDataEntryValue | null): string {
  const t = String(waarde ?? '/');
  return /^\/(?![/\\])[^\s]*$/.test(t) && t.length <= 500 ? t : '/';
}

export async function regelActie(form: FormData) {
  const g = await vereisGebruiker();
  const soort = String(form.get('soort')) as DoelSoort;
  const id = String(form.get('id') ?? '').slice(0, 200);
  const actie = String(form.get('actie'));
  if (!DOEL_SOORTEN.includes(soort) || !id) throw new Error('Ongeldige regel');
  if (actie === 'wissen') await wisRegel(g.id, soort, id);
  else if (ACTIES.includes(actie as Actie)) await zetRegel(g.id, soort, id, actie as Actie);
  else throw new Error('Ongeldige actie');
  revalidatePath('/', 'layout');
  redirect(veiligTerug(form.get('terug')));
}

export async function bronVoorstellen(form: FormData) {
  const g = await vereisGebruiker();
  const gebied = String(form.get('gebied') ?? '').slice(0, 100);
  const naam = String(form.get('naam') ?? '').trim().slice(0, 200);
  const url = String(form.get('url') ?? '').trim().slice(0, 500) || null;
  const toelichting = String(form.get('toelichting') ?? '').trim().slice(0, 1000) || null;
  const terug = new URL(veiligTerug(form.get('terug')), 'http://intern');
  const naarTerug = (sleutel: string, waarde: string) => {
    terug.searchParams.set(sleutel, waarde);
    redirect(`${terug.pathname}${terug.search}#bronnen`);
  };
  if (!naam || !gebied) naarTerug('bron', 'leeg');
  if (url && !/^https?:\/\//i.test(url)) naarTerug('bron', 'url');
  await pool().query(
    `INSERT INTO nz_bronvoorstellen (gebruiker, gebied, naam, url, toelichting) VALUES ($1, $2, $3, $4, $5)`,
    [g.id, gebied, naam, url, toelichting],
  );
  revalidatePath('/ontdekken');
  naarTerug('bron', 'toegevoegd');
}

export async function interesseOpslaan(form: FormData) {
  const g = await vereisGebruiker();
  const { termen } = await import('@/lib/interesses');
  const naam = String(form.get('naam') ?? '').trim().slice(0, 100);
  if (!naam) redirect('/mijn-nieuws#interesse');
  const zoek = termen(String(form.get('zoektermen') ?? ''));
  const uit = termen(String(form.get('uitsluitingen') ?? ''));
  const id = Number(form.get('interesse') ?? 0);
  if (id) {
    await pool().query(
      `UPDATE nz_interesses SET naam = $3, zoektermen = $4, uitsluitingen = $5 WHERE id = $1 AND gebruiker = $2`,
      [id, g.id, naam, zoek, uit],
    );
  } else {
    await pool().query(
      `INSERT INTO nz_interesses (gebruiker, naam, zoektermen, uitsluitingen) VALUES ($1, $2, $3, $4)`,
      [g.id, naam, zoek, uit],
    );
  }
  revalidatePath('/', 'layout');
  redirect('/mijn-nieuws');
}

export async function interesseWijzig(form: FormData) {
  const g = await vereisGebruiker();
  const id = Number(form.get('interesse'));
  const wat = String(form.get('wat'));
  if (wat === 'verwijder') await pool().query(`DELETE FROM nz_interesses WHERE id = $1 AND gebruiker = $2`, [id, g.id]);
  else if (wat === 'demp' || wat === 'activeer') {
    await pool().query(`UPDATE nz_interesses SET gedempt = $3 WHERE id = $1 AND gebruiker = $2`, [id, g.id, wat === 'demp']);
  }
  revalidatePath('/', 'layout');
  redirect(veiligTerug(form.get('terug')));
}

export async function watchlistActie(form: FormData) {
  const g = await vereisGebruiker();
  const instrument = String(form.get('instrument') ?? '').slice(0, 50);
  if (!instrument) redirect('/finance');
  if (form.get('wat') === 'volg') {
    await pool().query(`INSERT INTO nz_watchlist (gebruiker, instrument) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [g.id, instrument]);
  } else {
    await pool().query(`DELETE FROM nz_watchlist WHERE gebruiker = $1 AND instrument = $2`, [g.id, instrument]);
  }
  revalidatePath('/finance', 'layout');
  redirect(veiligTerug(form.get('terug')));
}

export async function agendaActie(form: FormData) {
  const g = await vereisGebruiker();
  const soort = String(form.get('soort'));
  const id = String(form.get('id') ?? '').slice(0, 200);
  const actie = String(form.get('actie'));
  if (!['evenement', 'categorie', 'locatie'].includes(soort) || !id) throw new Error('Ongeldige keuze');
  if (actie === 'wissen') {
    await pool().query(`DELETE FROM nz_agendakeuzes WHERE gebruiker = $1 AND doel_soort = $2 AND doel_id = $3`, [g.id, soort, id]);
  } else if (actie === 'volgen' || actie === 'verbergen') {
    await pool().query(
      `INSERT INTO nz_agendakeuzes (gebruiker, doel_soort, doel_id, actie) VALUES ($1, $2, $3, $4)
       ON CONFLICT (gebruiker, doel_soort, doel_id) DO UPDATE SET actie = EXCLUDED.actie, aangemaakt_at = now()`,
      [g.id, soort, id, actie],
    );
  } else throw new Error('Ongeldige actie');
  revalidatePath('/agenda', 'layout');
  redirect(veiligTerug(form.get('terug')));
}
