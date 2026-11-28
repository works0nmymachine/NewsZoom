import { agendaActie } from '@/app/acties';
import { CategorieLabel } from './categorie-filter';
import { agendaBeoordeel, CATEGORIE_NAAM, LOCATIETYPE_NAAM, type AgendaKeuze } from '@/lib/agenda';
import type { Evenement } from '@/lib/finance-agenda-types';

const dFmt = new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', weekday: 'short', day: 'numeric', month: 'short' });
const tFmt = new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' });

export function wanneerEvenement(e: Pick<Evenement, 'start' | 'eind'>): string {
  const s = new Date(e.start.length === 10 ? `${e.start}T12:00:00` : e.start);
  const metTijd = e.start.length > 10;
  const begin = `${dFmt.format(s)}${metTijd ? ` ${tFmt.format(s)}` : ''}`;
  if (!e.eind || e.eind.slice(0, 10) === e.start.slice(0, 10)) return begin;
  const eind = new Date(e.eind.length === 10 ? `${e.eind}T12:00:00` : e.eind);
  return `${dFmt.format(s)} t/m ${dFmt.format(eind)}`;
}

export function EvenementKaart({ e, keuzes, terug, toonPlaats = true }: { e: Evenement; keuzes: AgendaKeuze[]; terug: string; toonPlaats?: boolean }) {
  const b = agendaBeoordeel(e, keuzes);
  const eigen = keuzes.find((k) => k.doelSoort === 'evenement' && k.doelId === e.id);
  const podium = keuzes.find((k) => k.doelSoort === 'locatie' && k.doelId === e.locatie);
  const verstoring = e.categorie === 'verstoring';
  return (
    <article className={`kaart${b.zichtbaar ? '' : ' kaart-verborgen'}`} data-cat={e.categorie}>
      <p className="evenement-datum">
        {wanneerEvenement(e)}
        {verstoring && <span className={`label${e.verstoring === 'actueel' || e.status === 'actueel' ? ' status-actueel' : ''}`}>{e.verstoring === 'actueel' || e.status === 'actueel' ? 'Actuele verstoring' : 'Gepland werk'}</span>}
        {e.status === 'gewijzigd' && <span className="label">Gewijzigd</span>}
        {e.status === 'geannuleerd' && <span className="label">Geannuleerd</span>}
        {b.gevolgd && <span className="label">Gevolgd</span>}
      </p>
      <h3 className="kaart-titel">{e.titel}</h3>
      <p className="kaart-meta">
        <span>{e.locatie}{toonPlaats ? `, ${e.plaats}` : ''}{e.wijk ? ` (${e.wijk})` : ''}</span>
        <CategorieLabel c={e.categorie} />
        {e.locatieType && <span>{LOCATIETYPE_NAAM[e.locatieType]}</span>}
        {e.genre && <span>{e.genre}</span>}
        {e.gratis && <span className="label label-zacht">Gratis</span>}
        {e.aanmelden && <span className="label label-zacht">Aanmelden verplicht</span>}
      </p>
      <p>{e.beschrijving}</p>
      {!b.zichtbaar && b.regel && <p className="verborgen-melding">Verborgen door je keuze voor {b.regel.doelSoort === 'categorie' ? `de categorie ${CATEGORIE_NAAM[b.regel.doelId as Evenement['categorie']]}` : b.regel.doelSoort === 'locatie' ? b.regel.doelId : 'dit evenement'}.</p>}
      <div className="kaart-acties">
        <a className="knop knop-klein knop-zacht" href={e.bron.url} rel="noopener noreferrer" target="_blank">{e.bron.naam} ↗</a>
        <form action={agendaActie} className="knoppenrij">
          <input type="hidden" name="soort" value="evenement" />
          <input type="hidden" name="id" value={e.hoofdevenement ?? e.id} />
          <input type="hidden" name="terug" value={terug} />
          <button className="chip" name="actie" value={eigen?.actie === 'volgen' ? 'wissen' : 'volgen'} aria-pressed={eigen?.actie === 'volgen'}>{e.hoofdevenement ? 'Hoofdevenement volgen' : 'Volgen'}</button>
          <button className="chip" name="actie" value={eigen?.actie === 'verbergen' ? 'wissen' : 'verbergen'} aria-pressed={eigen?.actie === 'verbergen'}>Verbergen</button>
        </form>
        {(e.locatieType === 'kroeg' || e.locatieType === 'cafe' || e.locatieType === 'klein-theater' || e.locatieType === 'podium') && (
          <form action={agendaActie}>
            <input type="hidden" name="soort" value="locatie" />
            <input type="hidden" name="id" value={e.locatie} />
            <input type="hidden" name="terug" value={terug} />
            <button className="chip" name="actie" value={podium?.actie === 'volgen' ? 'wissen' : 'volgen'} aria-pressed={podium?.actie === 'volgen'}>Podium volgen</button>
            <button className="chip chip-zacht" name="actie" value={podium?.actie === 'verbergen' ? 'wissen' : 'verbergen'} aria-pressed={podium?.actie === 'verbergen'}>Podium verbergen</button>
          </form>
        )}
      </div>
    </article>
  );
}
