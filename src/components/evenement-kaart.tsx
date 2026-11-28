import { AgendaKnop } from './agenda-knoppen';
import { Icoon } from './iconen';
import { KaartMenu } from './kaart-menu';
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

export function EvenementKaart({ e, keuzes, toonPlaats = true }: { e: Evenement; keuzes: AgendaKeuze[]; toonPlaats?: boolean }) {
  const b = agendaBeoordeel(e, keuzes);
  const eigen = keuzes.find((k) => k.doelSoort === 'evenement' && k.doelId === e.id);
  const podium = keuzes.find((k) => k.doelSoort === 'locatie' && k.doelId === e.locatie);
  const verstoring = e.categorie === 'verstoring';
  return (
    <article className={`kaart${b.zichtbaar ? '' : ' kaart-verborgen'}`}>
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
        <span>{CATEGORIE_NAAM[e.categorie]}</span>
        {e.locatieType && <span>{LOCATIETYPE_NAAM[e.locatieType]}</span>}
        {e.genre && <span>{e.genre}</span>}
        {e.gratis && <span className="label label-zacht">Gratis</span>}
        {e.aanmelden && <span className="label label-zacht">Aanmelden verplicht</span>}
      </p>
      <p>{e.beschrijving}</p>
      {!b.zichtbaar && b.regel && <p className="verborgen-melding">Verborgen door je keuze voor {b.regel.doelSoort === 'categorie' ? `de categorie ${CATEGORIE_NAAM[b.regel.doelId as Evenement['categorie']]}` : b.regel.doelSoort === 'locatie' ? b.regel.doelId : 'dit evenement'}.</p>}
      <div className="kaart-voet">
        <a className="bronlink" href={e.bron.url} rel="noopener noreferrer" target="_blank">{e.bron.naam}<Icoon naam="extern" grootte={13} /></a>
        <div className="kaart-knoppen">
          <AgendaKnop soort="evenement" id={e.hoofdevenement ?? e.id} naam={e.titel} actie="volgen" huidig={eigen?.actie ?? null}
            tekst={e.hoofdevenement ? 'Hoofdevenement volgen' : 'Volgen'} aanTekst="Gevolgd" />
          <KaartMenu titel={e.titel}>
            <section className="paneel-sectie">
              <h4>Dit evenement</h4>
              <div className="knoppenrij">
                <AgendaKnop soort="evenement" id={e.hoofdevenement ?? e.id} naam={e.titel} actie="verbergen" huidig={eigen?.actie ?? null} tekst="Verbergen" aanTekst="Verborgen" />
              </div>
            </section>
            {(e.locatieType === 'kroeg' || e.locatieType === 'cafe' || e.locatieType === 'klein-theater' || e.locatieType === 'podium') && (
              <section className="paneel-sectie">
                <h4>Podium: {e.locatie}</h4>
                <div className="knoppenrij">
                  <AgendaKnop soort="locatie" id={e.locatie} naam={e.locatie} actie="volgen" huidig={podium?.actie ?? null} tekst="Podium volgen" aanTekst="Podium gevolgd" />
                  <AgendaKnop soort="locatie" id={e.locatie} naam={e.locatie} actie="verbergen" huidig={podium?.actie ?? null} tekst="Podium verbergen" aanTekst="Podium verborgen" zacht />
                </div>
              </section>
            )}
            <p className="paneel-links"><a href={e.bron.url} rel="noopener noreferrer" target="_blank">{e.bron.naam} <Icoon naam="extern" grootte={14} /></a></p>
          </KaartMenu>
        </div>
      </div>
    </article>
  );
}
