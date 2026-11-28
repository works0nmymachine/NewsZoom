import Link from 'next/link';
import { beoordeel, type Beoordeling, type Regel } from '@/lib/filters';
import type { Herkomst } from '@/lib/herkenning';
import type { Item, Samengevoegd } from '@/lib/inhoud';
import { beschrijfRegel, wanneer, wanneerKort } from '@/lib/weergave';
import { Icoon } from './iconen';
import { KaartMenu, RegelKnoppen, type Doel } from './kaart-menu';

type Props = {
  item: Item; inhoud: Samengevoegd; regels: Regel[];
  ook?: Item[]; b?: Beoordeling; reden?: string | null; nieuwSinds?: Date | null;
  toonVerhaal?: boolean; compact?: boolean; tochGetoond?: boolean;
};

const redactie = (i: Item) => i.uitgever ?? i.bron;

function waaromOnderwerp(h: Herkomst, inhoud: Samengevoegd, item: Item): string {
  const naam = inhoud.onderwerpen.get(h.id)?.naam ?? h.id;
  if (h.via === 'bron') return `${naam}: elk bericht van ${inhoud.bronnen.get(item.bron)?.naam ?? item.bron} valt hieronder.`;
  if (h.via === 'categorie') return `${naam}: de bron zelf rekent dit tot “${h.term}”.`;
  if (h.via === 'verhaal') return `${naam}: hoort bij het gekoppelde verhaal.`;
  return `${naam}: herkend aan “${h.term}”.`;
}

/** Eén bericht. De titel opent het verhaal (of het artikel); de bronnaam opent altijd het artikel; de rest zit achter ⋯. */
export function BerichtKaart({ item, inhoud, regels, ook = [], b, reden, nieuwSinds, toonVerhaal = true, compact = false, tochGetoond = false }: Props) {
  const bron = inhoud.bronnen.get(item.bron);
  const bronNaam = bron?.naam ?? item.bron;
  const verhaal = item.verhaal ? inhoud.verhalen.get(item.verhaal) : undefined;
  const beoordeling = b ?? beoordeel(item, regels);
  const huidig = (soort: Doel['soort'], id: string) => regels.find((r) => r.doelSoort === soort && r.doelId === id)?.actie ?? null;
  const doelen: Doel[] = [
    ...(verhaal ? [{ soort: 'verhaal' as const, id: verhaal.id, naam: verhaal.titel, huidig: huidig('verhaal', verhaal.id) }] : []),
    ...item.onderwerpen.map((o) => ({ soort: 'onderwerp' as const, id: o, naam: inhoud.onderwerpen.get(o)?.naam ?? o, huidig: huidig('onderwerp', o) })),
    { soort: 'bron' as const, id: item.bron, naam: bronNaam, huidig: huidig('bron', item.bron) },
  ];
  const verhaalUrl = verhaal ? `/verhaal/${verhaal.id}?bericht=${encodeURIComponent(item.id)}` : null;
  const isNieuw = !!nieuwSinds && new Date(item.gepubliceerd) > nieuwSinds;
  const andere = ook.filter((o) => redactie(o) !== redactie(item));
  const ookNamen = [...new Set(andere.map((o) => inhoud.bronnen.get(o.bron)?.naam ?? o.bron))];
  const verborgen = !beoordeling.zichtbaar;
  const voettekst = ookNamen.length > 0
    ? <>Ook bij {ookNamen.slice(0, 3).join(', ')}{ookNamen.length > 3 ? ` en ${ookNamen.length - 3} meer` : ''}</>
    : reden;
  const metVoet = !!voettekst || !!verhaal;

  const menu = (
    <KaartMenu titel={item.titel}>
      <section className="paneel-sectie">
        <h4>Waarom zie ik dit?</h4>
        {beoordeling.doorslaggevend
          ? <p>{beschrijfRegel(beoordeling.doorslaggevend, inhoud)}</p>
          : <p>Geen persoonlijke regel. De volgorde komt van belang, actualiteit{ook.length ? ' en het aantal bronnen' : ''}.</p>}
        {beoordeling.toegepast.length > 1 && (
          <ul>{beoordeling.toegepast.filter((r) => r !== beoordeling.doorslaggevend).map((r) => <li key={r.id}>Ook: {beschrijfRegel(r, inhoud)}</li>)}</ul>
        )}
        {item.gekoppeld && verhaal && <p className="zacht">Automatisch gekoppeld aan “{verhaal.titel}” op trefwoorden.</p>}
        {item.waaromOnderwerp && item.waaromOnderwerp.length > 0 && (
          <ul className="zacht">{item.waaromOnderwerp.map((h) => <li key={h.id}>{waaromOnderwerp(h, inhoud, item)}</li>)}</ul>
        )}
        {item.herkomst === 'feed' && item.onderwerpen.length === 0 && <p className="zacht">Geen onderwerp herkend; filters op onderwerp gelden hier niet.</p>}
      </section>
      {andere.length > 0 && (
        <section className="paneel-sectie">
          <h4>Ook bij</h4>
          <ul className="ook-lijst">
            {andere.map((o) => (
              <li key={o.id}><a href={o.url} rel="noopener noreferrer" target="_blank">{inhoud.bronnen.get(o.bron)?.naam ?? o.bron}: {o.titel}</a> <span className="zacht">{wanneerKort(o.gepubliceerd)}</span></li>
            ))}
          </ul>
        </section>
      )}
      <section className="paneel-sectie">
        <h4>Aanpassen</h4>
        <RegelKnoppen doelen={doelen} />
      </section>
      <p className="paneel-links">
        <a href={item.url} rel="noopener noreferrer" target="_blank">Lees bij {bronNaam} <Icoon naam="extern" grootte={14} /></a>
        <Link href="/filters">Mijn filters</Link>
      </p>
    </KaartMenu>
  );

  return (
    <article className={`kaart${verborgen && !tochGetoond ? ' kaart-verborgen' : ''}${isNieuw ? ' kaart-nieuw' : ''}`}>
      {verborgen && beoordeling.doorslaggevend && (
        <p className="verborgen-melding">{tochGetoond ? 'Toch getoond bij zoeken. ' : 'Verborgen in je gefilterde weergave. '}{beschrijfRegel(beoordeling.doorslaggevend, inhoud)}</p>
      )}
      <div className="kaart-rij">
        <div className="kaart-hoofd">
          {toonVerhaal && verhaal && <p className="kaart-verhaal"><Link href={`/verhaal/${verhaal.id}`}>{verhaal.titel}</Link></p>}
          <h3 className="kaart-titel">
            {verhaalUrl ? <Link href={verhaalUrl}>{item.titel}</Link> : <a href={item.url} rel="noopener noreferrer" target="_blank">{item.titel}</a>}
          </h3>
          <div className="kaart-meta">
            <a className="bronlink" href={item.url} rel="noopener noreferrer" target="_blank" aria-label={`Lees bij ${bronNaam} (opent nieuw venster)`}>
              {bronNaam}<Icoon naam="extern" grootte={13} />
            </a>
            <time dateTime={item.gepubliceerd} title={wanneer(item.gepubliceerd)}>{wanneerKort(item.gepubliceerd)}</time>
            {isNieuw && <span className="label label-nieuw">Nieuw</span>}
            {item.taal === 'en' && <span className="label label-zacht" title="Engelstalig">EN</span>}
            {item.soort === 'mededeling' && <span className="label label-zacht">Mededeling</span>}
            {!metVoet && <div className="kaart-meta-menu">{menu}</div>}
          </div>
        </div>
        {item.afbeelding && (
          // eslint-disable-next-line @next/next/no-img-element -- afbeelding van de uitgever, bewust zonder optimalisatieserver
          <img className="kaart-beeld" src={item.afbeelding} alt="" width={84} height={84} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
        )}
      </div>
      {!compact && item.samenvatting && <p className="kaart-samenvatting">{item.samenvatting}</p>}
      {item.nieuw && <p className="nieuw"><strong>Nieuw:</strong> {item.nieuw}</p>}
      {metVoet && <div className="kaart-voet">
        <span className="kaart-reden">{voettekst}</span>
        <div className="kaart-knoppen">
          {verhaal && (
            <Link className="knop-tekst" href={`${verhaalUrl}#achtergrond`}><Icoon naam="laag" grootte={16} />Achtergrond</Link>
          )}
          {menu}
        </div>
      </div>}
    </article>
  );
}
