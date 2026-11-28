'use server';

import { refresh, revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { pool } from '@/lib/db';
import type { Actie, DoelSoort } from '@/lib/filters';
import { GEBIEDEN } from '@/lib/gebieden';
import { inhoud } from '@/lib/inhoud';
import { ACTIES, DOEL_SOORTEN, regelsVan, wisRegel, zetRegel } from '@/lib/regels';
import { vereisGebruiker } from '@/lib/sessie';

export type RegelUitkomst = {
  vorige: Actie | null;
  suggestie?: { onderwerp: string; naam: string; aantal: number };
};

/**
 * Meer / Minder / Verbergen / wissen zonder paginasprong: de client roept dit aan, toont een melding met
 * Ongedaan maken (de vorige actie terugzetten) en de pagina ververst op dezelfde plek.
 * Na drie verborgen of minder getoonde verhalen met hetzelfde onderwerp volgt een voorstel, geen automatische regel.
 */
export async function regelWijzigen(soort: DoelSoort, id: string, actie: Actie | 'wissen'): Promise<RegelUitkomst> {
  const g = await vereisGebruiker();
  id = String(id ?? '').slice(0, 200);
  if (!DOEL_SOORTEN.includes(soort) || !id) throw new Error('Ongeldige regel');
  if (actie !== 'wissen' && !ACTIES.includes(actie)) throw new Error('Ongeldige actie');
  const regels = await regelsVan(g.id);
  const vorige = regels.find((r) => r.doelSoort === soort && r.doelId === id)?.actie ?? null;
  if (actie === 'wissen') await wisRegel(g.id, soort, id);
  else await zetRegel(g.id, soort, id, actie);

  let suggestie: RegelUitkomst['suggestie'];
  if (soort === 'verhaal' && (actie === 'minder' || actie === 'verbergen')) {
    const verhalen = inhoud().verhalen;
    const negatief = [...regels.filter((r) => !(r.doelSoort === 'verhaal' && r.doelId === id)), { doelSoort: 'verhaal', doelId: id, actie }]
      .filter((r) => r.doelSoort === 'verhaal' && (r.actie === 'minder' || r.actie === 'verbergen'));
    const telling = new Map<string, number>();
    for (const r of negatief) for (const o of verhalen.get(r.doelId)?.onderwerpen ?? []) telling.set(o, (telling.get(o) ?? 0) + 1);
    const [o, aantal] = [...telling.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    if (o && aantal >= 3 && !regels.some((r) => r.doelSoort === 'onderwerp' && r.doelId === o)) {
      suggestie = { onderwerp: o, naam: inhoud().onderwerpen.get(o)?.naam ?? o, aantal };
    }
  }
  refresh();
  return { vorige, suggestie };
}

/** Lokaal gebied kiezen (Instellingen en eerste keer). */
export async function gebiedKiezen(form: FormData) {
  const g = await vereisGebruiker();
  const gebied = String(form.get('gebied') ?? '');
  const geldig = gebied === 'geen' || GEBIEDEN.some((x) => x.id === gebied);
  if (!geldig) throw new Error('Onbekend gebied');
  await pool().query(
    `INSERT INTO nz_instellingen (gebruiker, gebied) VALUES ($1, $2) ON CONFLICT (gebruiker) DO UPDATE SET gebied = EXCLUDED.gebied`,
    [g.id, gebied],
  );
  refresh();
}

/** Thema: systeem, licht of donker. Bewaard als cookie, zodat de eerste weergave al klopt. */
export async function themaKiezen(form: FormData) {
  const thema = String(form.get('thema') ?? 'systeem');
  const jar = await cookies();
  if (thema === 'licht' || thema === 'donker') jar.set('nz_thema', thema, { path: '/', maxAge: 365 * 86400, sameSite: 'lax' });
  else jar.delete('nz_thema');
  refresh();
}

/** Eerste keer: onderwerpen kiezen (Meer of Minder) en een gebied. Ook Overslaan komt hier. */
export async function startOpslaan(form: FormData) {
  const g = await vereisGebruiker();
  if (form.get('wat') !== 'overslaan') {
    for (const [k, v] of form.entries()) {
      if (!k.startsWith('o:')) continue;
      const id = k.slice(2, 100);
      if (v === 'meer' || v === 'minder') await zetRegel(g.id, 'onderwerp', id, v);
    }
  }
  const gebied = String(form.get('gebied') ?? '');
  const geldig = gebied === 'geen' || GEBIEDEN.some((x) => x.id === gebied);
  await pool().query(
    `INSERT INTO nz_instellingen (gebruiker, gebied, start_klaar_at) VALUES ($1, $2, now())
     ON CONFLICT (gebruiker) DO UPDATE SET start_klaar_at = now(), gebied = COALESCE(EXCLUDED.gebied, nz_instellingen.gebied)`,
    [g.id, geldig && form.get('wat') !== 'overslaan' ? gebied : null],
  );
  revalidatePath('/', 'layout');
  redirect('/');
}

/** Alleen interne paden als terugadres. */
function veiligTerug(waarde: FormDataEntryValue | null): string {
  const t = String(waarde ?? '/');
  return /^\/(?![/\\])[^\s]*$/.test(t) && t.length <= 500 ? t : '/';
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
  if (!naam || !gebied) naarTerug('bron_status', 'leeg');
  if (url && !/^https?:\/\//i.test(url)) naarTerug('bron_status', 'url');
  await pool().query(
    `INSERT INTO nz_bronvoorstellen (gebruiker, gebied, naam, url, toelichting) VALUES ($1, $2, $3, $4, $5)`,
    [g.id, gebied, naam, url, toelichting],
  );
  revalidatePath('/ontdekken');
  naarTerug('bron_status', 'toegevoegd');
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

type AgendaSoort = 'evenement' | 'categorie' | 'locatie';
type AgendaActie = 'volgen' | 'verbergen';

/** Agenda: volgen of verbergen zonder paginasprong. Geeft de vorige keuze terug voor Ongedaan maken. */
export async function agendaWijzigen(soort: AgendaSoort, id: string, actie: AgendaActie | 'wissen'): Promise<{ vorige: AgendaActie | null }> {
  const g = await vereisGebruiker();
  id = String(id ?? '').slice(0, 200);
  if (!['evenement', 'categorie', 'locatie'].includes(soort) || !id) throw new Error('Ongeldige keuze');
  if (!['volgen', 'verbergen', 'wissen'].includes(actie)) throw new Error('Ongeldige actie');
  const { rows } = await pool().query(`SELECT actie FROM nz_agendakeuzes WHERE gebruiker = $1 AND doel_soort = $2 AND doel_id = $3`, [g.id, soort, id]);
  if (actie === 'wissen') {
    await pool().query(`DELETE FROM nz_agendakeuzes WHERE gebruiker = $1 AND doel_soort = $2 AND doel_id = $3`, [g.id, soort, id]);
  } else {
    await pool().query(
      `INSERT INTO nz_agendakeuzes (gebruiker, doel_soort, doel_id, actie) VALUES ($1, $2, $3, $4)
       ON CONFLICT (gebruiker, doel_soort, doel_id) DO UPDATE SET actie = EXCLUDED.actie, aangemaakt_at = now()`,
      [g.id, soort, id, actie],
    );
  }
  refresh();
  return { vorige: rows[0]?.actie ?? null };
}
