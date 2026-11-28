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

/** Zet een achtergrond in de wachtrij; de ingest-worker voert hem uit binnen het maandbudget. */
export async function achtergrondAanvragen(form: FormData) {
  const g = await vereisGebruiker();
  const { aiBeschikbaar, invoerVoorBericht, invoerVoorVerhaal } = await import('@/lib/achtergrond');
  const { inhoudMetFeeds, itemOpId } = await import('@/lib/feeds');
  const soort = String(form.get('soort'));
  const id = String(form.get('id') ?? '').slice(0, 200);
  const terug = veiligTerug(form.get('terug'));
  if (!aiBeschikbaar()) redirect(terug);
  let invoer: object | null = null;
  if (soort === 'verhaal') {
    const inhoud = await inhoudMetFeeds();
    const v = inhoud.verhalen.get(id);
    if (v) invoer = invoerVoorVerhaal(v, inhoud);
  } else if (soort === 'bericht') {
    const r = await itemOpId(id);
    if (r) invoer = invoerVoorBericht(r.item, r.inhoud);
  }
  if (!invoer) throw new Error('Onbekend verhaal of bericht');
  // Een lopende opdracht niet opnieuw starten; een klare of mislukte wel.
  await pool().query(
    `INSERT INTO nz_achtergronden (sleutel, status, invoer, aangevraagd_door) VALUES ($1, 'wachtend', $2, $3)
     ON CONFLICT (sleutel) DO UPDATE SET status = 'wachtend', invoer = EXCLUDED.invoer, aangevraagd_door = EXCLUDED.aangevraagd_door,
       aangevraagd_at = now(), gestart_at = NULL, fout = NULL
     WHERE nz_achtergronden.status IN ('klaar', 'mislukt')`,
    [`${soort}:${id}`, invoer, g.id],
  );
  revalidatePath(terug.split('?')[0]);
  redirect(terug);
}

const naarInstellingen = (params: Record<string, string>, anker: string): never => {
  redirect(`/instellingen?${new URLSearchParams(params)}#${anker}`);
};

/** Bron toevoegen voor een doel: feed zoeken (SSRF-veilig), direct de eerste berichten ophalen. Geen feed: voorstel. */
export async function bronToevoegen(form: FormData) {
  const g = await vereisGebruiker();
  const { DOELEN, FEED_DOELEN, zoekFeed } = await import('@/lib/bronnen');
  const { NietToegestaan } = await import('../../scripts/veilig-ophalen.mjs');
  const { slaItemsOp } = await import('../../scripts/feed-opslaan.mjs');
  const doel = String(form.get('doel')) as keyof typeof DOELEN;
  if (!(doel in DOELEN) || doel === 'achtergrond') throw new Error('Onbekend doel');
  const anker = `bronnen-${doel}`;
  const url = String(form.get('url') ?? '').trim().slice(0, 500);
  const naamInvoer = String(form.get('naam') ?? '').trim().slice(0, 200);
  if (!/^https?:\/\//i.test(url)) naarInstellingen({ doel, bron: 'url' }, anker);

  const voorstel = async (naam: string) => {
    await pool().query(
      `INSERT INTO nz_bronvoorstellen (gebruiker, gebied, naam, url, toelichting) VALUES ($1, $2, $3, $4, $5)`,
      [g.id, doel, naam.slice(0, 200) || new URL(url).hostname, url, 'Via Instellingen; geen feed gevonden.'],
    );
  };
  if (!FEED_DOELEN.includes(doel)) {
    await voorstel(naamInvoer);
    revalidatePath('/instellingen');
    naarInstellingen({ doel, bron: 'voorstel' }, anker);
  }

  let gevonden: Awaited<ReturnType<typeof zoekFeed>>;
  try {
    gevonden = await zoekFeed(url);
  } catch (e) {
    naarInstellingen({ doel, bron: e instanceof NietToegestaan ? 'geweigerd' : 'onbereikbaar' }, anker);
  }
  const { vondst, titel } = gevonden!;
  if (!vondst) {
    await voorstel(naamInvoer || titel);
    revalidatePath('/instellingen');
    naarInstellingen({ doel, bron: 'voorstel' }, anker);
  }
  const v = vondst!;
  const bestaand = await pool().query(`SELECT id FROM nz_feedbronnen WHERE feed_url = $1 AND actief`, [v.feedUrl]);
  if (bestaand.rows.length) naarInstellingen({ doel, bron: 'bestaat' }, anker);

  const d = DOELEN[doel];
  const host = new URL(v.homepage).hostname.replace(/^www\./, '');
  const id = `g-${host.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40)}-${crypto.randomUUID().slice(0, 6)}`;
  const naam = (naamInvoer || v.titel || titel || host).slice(0, 200);
  await pool().query(
    `INSERT INTO nz_feedbronnen (id, naam, homepage, feed_url, soort, reikwijdte, gebied, onderwerpen, actief, herkomst, toegevoegd_door,
       laatste_controle, laatste_succes)
     VALUES ($1, $2, $3, $4, 'journalistiek', $5, $6, $7, true, 'gebruiker', $8, now(), now())`,
    [id, naam, v.homepage, v.feedUrl, d.reikwijdte, d.gebied, d.onderwerpen, g.id],
  );
  const nieuw = await slaItemsOp(pool(), id, v.items);
  revalidatePath('/', 'layout');
  naarInstellingen({ doel, bron: nieuw ? 'toegevoegd' : 'leeg', n: String(nieuw) }, anker);
}

export async function bronWijzig(form: FormData) {
  await vereisGebruiker();
  const id = String(form.get('id') ?? '').slice(0, 200);
  const wat = String(form.get('wat'));
  const doel = String(form.get('doel') ?? '').replace(/[^a-z]/g, '');
  if (wat === 'pauzeer' || wat === 'hervat') {
    await pool().query(`UPDATE nz_feedbronnen SET gepauzeerd = $2 WHERE id = $1`, [id, wat === 'pauzeer']);
  } else if (wat === 'verwijder') {
    // Alleen zelf toegevoegde bronnen; de vaste bronnen staan in data/feeds.json.
    await pool().query(`DELETE FROM nz_feedbronnen WHERE id = $1 AND herkomst = 'gebruiker'`, [id]);
  } else throw new Error('Ongeldige actie');
  revalidatePath('/', 'layout');
  redirect(`/instellingen#bronnen-${doel}`);
}

export async function aiInstellen(form: FormData) {
  await vereisGebruiker();
  const { prijslijst } = await import('../../scripts/llm/prijzen.mjs');
  const lijst = prijslijst() as Record<string, { modellen: Record<string, unknown> }>;
  const provider = String(form.get('provider'));
  const budget = Number(String(form.get('budget') ?? '').replace(',', '.'));
  if (!['openai', 'anthropic', 'uit'].includes(provider)) throw new Error('Onbekende provider');
  if (!Number.isFinite(budget) || budget < 0 || budget > 500) naarInstellingen({ ai: 'budget' }, 'ai');
  const zet = (sleutel: string, waarde: unknown) => pool().query(
    `INSERT INTO nz_instellingen (sleutel, waarde) VALUES ($1, $2) ON CONFLICT (sleutel) DO UPDATE SET waarde = EXCLUDED.waarde, gewijzigd_at = now()`,
    [sleutel, JSON.stringify(waarde)],
  );
  await zet('llm_provider', provider);
  await zet('llm_budget_usd', Math.round(budget * 100) / 100);
  for (const p of ['openai', 'anthropic']) {
    const model = String(form.get(`${p}_model`) ?? '');
    if (lijst[p]?.modellen[model]) await zet(`${p}_model`, model);
  }
  revalidatePath('/instellingen');
  naarInstellingen({ ai: 'opgeslagen' }, 'ai');
}
