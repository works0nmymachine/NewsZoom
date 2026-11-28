import Link from 'next/link';
import { bronVoorstellen } from '@/app/acties';
import { BerichtKaart } from '@/components/bericht-kaart';
import { Icoon } from '@/components/iconen';
import { Kop } from '@/components/kop';
import { Paneel } from '@/components/paneel';
import { SchoonFormulier } from '@/components/schoon-formulier';
import { Zoekveld } from '@/components/zoekveld';
import { bronnenInGebied, versheid } from '@/lib/feeds';
import { beoordeel } from '@/lib/filters';
import { GEBIEDEN, gebiedVan, noemtGebied } from '@/lib/gebieden';
import { zonderAccenten } from '@/lib/herkenning';
import type { Item } from '@/lib/inhoud';
import { bezoek, instellingenVan } from '@/lib/instellingen';
import { paginaContext } from '@/lib/pagina';
import { uurOud } from '@/lib/rangorde';
import { kaarten, perDag, reden, top } from '@/lib/selectie';
import { wanneer } from '@/lib/weergave';

type Zoek = Promise<Record<string, string | string[] | undefined>>;
const REIKWIJDTE = { alles: 'Alles', nederland: 'Nederland', wereld: 'Wereld', lokaal: 'Lokaal' } as const;
const PERIODE = { vandaag: 'Vandaag', '24u': '24 uur', week: 'Week' } as const;
const SOORT = { journalistiek: 'Journalistiek', mededeling: 'Mededelingen' } as const;
const TAAL = { nl: 'Nederlands', en: 'Engels' } as const;
const PER_PAGINA = 40;

const een = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const lijst = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

export default async function Ontdekken({ searchParams }: { searchParams: Zoek }) {
  const p = await searchParams;
  const { gebruiker, regels, inhoud } = await paginaContext();
  const [vers, instellingen, vorigBezoek] = await Promise.all([versheid(), instellingenVan(gebruiker.id), bezoek(gebruiker.id)]);
  const nu = new Date();

  const q = (een(p.q) ?? '').trim().slice(0, 100);
  const rWaarde = een(p.r);
  const r = (rWaarde && rWaarde in REIKWIJDTE ? rWaarde : q ? 'alles' : 'nederland') as keyof typeof REIKWIJDTE;
  const breed = een(p.weergave) === 'breed';
  const gebied = gebiedVan(een(p.gebied) ?? instellingen.gebied?.id);
  const periode = (een(p.periode) && een(p.periode)! in PERIODE ? een(p.periode) : undefined) as keyof typeof PERIODE | undefined;
  const onderwerpen = lijst(p.o).filter((o) => inhoud.onderwerpen.has(o)).slice(0, 10);
  const bron = een(p.bron) && inhoud.bronnen.has(een(p.bron)!) ? een(p.bron) : undefined;
  const soort = (een(p.soort) && een(p.soort)! in SOORT ? een(p.soort) : undefined) as keyof typeof SOORT | undefined;
  const taal = (een(p.taal) && een(p.taal)! in TAAL ? een(p.taal) : undefined) as keyof typeof TAAL | undefined;
  const aantal = Math.min(400, Math.max(PER_PAGINA, Number(een(p.n)) || PER_PAGINA));
  const gefilterd = !!(q || periode || onderwerpen.length || bron || soort || taal);

  const params = { r: rWaarde || (q ? undefined : r), weergave: breed ? 'breed' : undefined, q: q || undefined, gebied: r === 'lokaal' ? gebied.id : undefined, periode, bron, soort, taal };
  const url = (extra: Record<string, string | undefined> = {}, o: string[] = onderwerpen) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...extra })) if (v) s.set(k, v);
    for (const x of o) s.append('o', x);
    return `/ontdekken?${s}`;
  };

  let items: Item[] = r === 'alles' ? inhoud.items : inhoud.items.filter((i) => i.reikwijdte === r);
  if (r === 'lokaal') items = items.filter((i) => i.gebied === (gebied.ouder ?? gebied.id) && noemtGebied(`${i.titel} ${i.samenvatting}`, gebied));
  if (periode) {
    const dag = new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', dateStyle: 'short' });
    items = items.filter((i) => periode === 'vandaag' ? dag.format(new Date(i.gepubliceerd)) === dag.format(nu) : uurOud(i.gepubliceerd, nu) <= (periode === '24u' ? 24 : 168));
  }
  if (onderwerpen.length) items = items.filter((i) => i.onderwerpen.some((o) => onderwerpen.includes(o)));
  if (bron) items = items.filter((i) => i.bron === bron || i.uitgever === bron);
  if (soort) items = items.filter((i) => i.soort === soort);
  if (taal) items = items.filter((i) => i.taal === taal);
  if (q) {
    const woorden = zonderAccenten(q).toLowerCase().split(/\s+/);
    items = items.filter((i) => {
      const t = zonderAccenten(`${i.titel} ${i.samenvatting} ${i.nieuw ?? ''} ${inhoud.verhalen.get(i.verhaal ?? '')?.titel ?? ''}`).toLowerCase();
      return woorden.every((w) => t.includes(w));
    });
  }

  // Een zoekterm negeert je verberg-regels: wat je zoekt, wil je vinden. Die berichten krijgen een label.
  const alles = kaarten(items, regels, nu, { breed: breed || !!q });
  const verborgen = !breed && !q ? items.filter((i) => !beoordeel(i, regels).zichtbaar).length : 0;
  const belangrijkst = gefilterd ? [] : top(alles.filter((k) => k.b.zichtbaar), 5);
  const rest = alles.filter((k) => !belangrijkst.includes(k));
  const getoond = rest.slice(0, aantal);
  const dagen = perDag(getoond, nu);

  const bronKeuzes = [...new Map([...inhoud.items].filter((i) => r === 'alles' || i.reikwijdte === r).map((i) => [i.uitgever ?? i.bron, inhoud.bronnen.get(i.uitgever ?? i.bron)?.naam ?? inhoud.bronnen.get(i.bron)?.naam ?? i.bron])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'nl'));
  const onderwerpKeuzes = [...inhoud.onderwerpen.values()].sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
  const kaart = (k: (typeof alles)[number]) => (
    <BerichtKaart key={k.item.id} item={k.item} ook={k.ook} b={k.b} reden={reden(k, inhoud)} inhoud={inhoud} regels={regels} nieuwSinds={vorigBezoek} tochGetoond={!!q} />
  );

  return (
    <main className="pagina met-zoekdock">
      <Kop titel="Ontdekken" sub="Al het nieuws, ook buiten wat je volgt" versheid={vers} />
      <nav className="segmenten" aria-label="Kies overzicht">
        {Object.entries(REIKWIJDTE).map(([k, naam]) => (
          <Link key={k} href={url({ r: k, gebied: k === 'lokaal' ? gebied.id : undefined, bron: undefined, n: undefined })} aria-current={k === r ? 'page' : undefined}>{naam}</Link>
        ))}
      </nav>
      {r === 'lokaal' && (
        <nav className="segmenten segmenten-klein" aria-label="Kies gebied">
          {GEBIEDEN.map((g) => <Link key={g.id} href={url({ gebied: g.id })} aria-current={g.id === gebied.id ? 'page' : undefined}>{g.naam}</Link>)}
        </nav>
      )}

      <div className="zoekdock">
        <div className="zoekdock-rij">
          <form action="/ontdekken" role="search">
            {rWaarde && <input type="hidden" name="r" value={r} />}
            {r === 'lokaal' && <input type="hidden" name="gebied" value={gebied.id} />}
            {breed && <input type="hidden" name="weergave" value="breed" />}
            {periode && <input type="hidden" name="periode" value={periode} />}
            {bron && <input type="hidden" name="bron" value={bron} />}
            {soort && <input type="hidden" name="soort" value={soort} />}
            {taal && <input type="hidden" name="taal" value={taal} />}
            {onderwerpen.map((o) => <input key={o} type="hidden" name="o" value={o} />)}
            <Zoekveld waarde={q} focus={een(p.zoek) === '1'} />
            <button className="icoonknop" aria-label="Zoek"><Icoon naam="zoek" /></button>
          </form>
          <Paneel titel="Filters" icoon="filter" label="Filters" actief={!!(periode || onderwerpen.length || bron || soort || taal || breed)}>
            <FilterFormulier r={r} gebied={gebied.id} q={q} breed={breed} periode={periode} onderwerpen={onderwerpen} bron={bron} soort={soort} taal={taal}
              bronKeuzes={bronKeuzes} onderwerpKeuzes={onderwerpKeuzes} />
          </Paneel>
        </div>
      </div>

      {(gefilterd || breed) && (
        <div className="actieve-filters" aria-label="Actieve filters">
          {q && <Link className="chip" href={url({ q: undefined })}>“{q}” <Icoon naam="sluiten" grootte={14} /></Link>}
          {periode && <Link className="chip" href={url({ periode: undefined })}>{PERIODE[periode]} <Icoon naam="sluiten" grootte={14} /></Link>}
          {onderwerpen.map((o) => <Link key={o} className="chip" href={url({}, onderwerpen.filter((x) => x !== o))}>{inhoud.onderwerpen.get(o)?.naam} <Icoon naam="sluiten" grootte={14} /></Link>)}
          {bron && <Link className="chip" href={url({ bron: undefined })}>{inhoud.bronnen.get(bron)?.naam ?? bron} <Icoon naam="sluiten" grootte={14} /></Link>}
          {soort && <Link className="chip" href={url({ soort: undefined })}>{SOORT[soort]} <Icoon naam="sluiten" grootte={14} /></Link>}
          {taal && <Link className="chip" href={url({ taal: undefined })}>{TAAL[taal]} <Icoon naam="sluiten" grootte={14} /></Link>}
          {breed && <Link className="chip" href={url({ weergave: undefined })}>Breed overzicht <Icoon naam="sluiten" grootte={14} /></Link>}
          <Link className="chip chip-zacht" href={`/ontdekken?r=${r}${r === 'lokaal' ? `&gebied=${gebied.id}` : ''}`}>Alles wissen</Link>
        </div>
      )}

      {verborgen > 0 && (
        <p className="zacht">{verborgen} {verborgen === 1 ? 'bericht' : 'berichten'} verborgen door je filters. <Link href={url({ weergave: 'breed' })}>Toon toch</Link></p>
      )}
      {r === 'lokaal' && gebied.ouder && alles.length > 0 && alles.length < 5 && (
        <p className="melding"><strong>Beperkte dekking voor {gebied.naam}:</strong> {alles.length} {alles.length === 1 ? 'bericht noemt' : 'berichten noemen'} dit gebied. Wijkbronnen{gebied.wijkbronnen?.length ? ` zoals ${gebied.wijkbronnen.map((b) => inhoud.bronnen.get(b)?.naam ?? b).join(', ')}` : ''} worden nog niet automatisch gevolgd. <a href="#bronnen">Bron toevoegen</a></p>
      )}
      {alles.length === 0 && <LeegOverzicht lokaal={r === 'lokaal'} gebiedNaam={gebied.naam} zoek={q} gefilterd={gefilterd} />}

      {belangrijkst.length > 0 && (
        <section className="sectie">
          <h2>Belangrijkste</h2>
          {belangrijkst.map(kaart)}
        </section>
      )}
      {getoond.length > 0 && (
        <section className="sectie">
          <h2>{gefilterd ? `${alles.length} ${alles.length === 1 ? 'resultaat' : 'resultaten'}` : 'Alle berichten'}</h2>
          {dagen.map((d) => (
            <div key={d.dag}>
              <h3 className="dag-kop">{d.naam}</h3>
              {d.kaarten.map(kaart)}
            </div>
          ))}
          {rest.length > getoond.length && <p><Link className="knop" scroll={false} href={url({ n: String(aantal + PER_PAGINA) })}>Meer berichten ({rest.length - getoond.length})</Link></p>}
        </section>
      )}

      {r === 'lokaal' && <BronnenPaneel gebiedId={gebied.ouder ?? gebied.id} gebiedNaam={gebied.naam} terug={url()} status={een(p.bron_status)} />}
    </main>
  );
}

function FilterFormulier({ r, gebied, q, breed, periode, onderwerpen, bron, soort, taal, bronKeuzes, onderwerpKeuzes }: {
  r: string; gebied: string; q: string; breed: boolean; periode?: string; onderwerpen: string[]; bron?: string; soort?: string; taal?: string;
  bronKeuzes: [string, string][]; onderwerpKeuzes: { id: string; naam: string }[];
}) {
  return (
    <div className="formulier">
      <SchoonFormulier action="/ontdekken">
        <input type="hidden" name="r" value={r} />
        {r === 'lokaal' && <input type="hidden" name="gebied" value={gebied} />}
        {q && <input type="hidden" name="q" value={q} />}
        <fieldset className="filtergroep">
          <legend>Periode</legend>
          <div className="keuzes">
            <label className="keuze"><input type="radio" name="periode" value="" defaultChecked={!periode} /><span>Alles</span></label>
            {Object.entries(PERIODE).map(([k, naam]) => <label key={k} className="keuze"><input type="radio" name="periode" value={k} defaultChecked={periode === k} /><span>{naam}</span></label>)}
          </div>
        </fieldset>
        <fieldset className="filtergroep">
          <legend>Onderwerp</legend>
          <div className="keuzes">
            {onderwerpKeuzes.map((o) => <label key={o.id} className="keuze"><input type="checkbox" name="o" value={o.id} defaultChecked={onderwerpen.includes(o.id)} /><span>{o.naam}</span></label>)}
          </div>
        </fieldset>
        <fieldset className="filtergroep">
          <legend>Bron</legend>
          <select name="bron" defaultValue={bron ?? ''} aria-label="Bron">
            <option value="">Alle bronnen</option>
            {bronKeuzes.map(([id, naam]) => <option key={id} value={id}>{naam}</option>)}
          </select>
        </fieldset>
        <fieldset className="filtergroep">
          <legend>Soort en taal</legend>
          <div className="keuzes">
            <label className="keuze"><input type="radio" name="soort" value="" defaultChecked={!soort} /><span>Alle soorten</span></label>
            {Object.entries(SOORT).map(([k, naam]) => <label key={k} className="keuze"><input type="radio" name="soort" value={k} defaultChecked={soort === k} /><span>{naam}</span></label>)}
          </div>
          <div className="keuzes" style={{ marginTop: '0.4rem' }}>
            <label className="keuze"><input type="radio" name="taal" value="" defaultChecked={!taal} /><span>Alle talen</span></label>
            {Object.entries(TAAL).map(([k, naam]) => <label key={k} className="keuze"><input type="radio" name="taal" value={k} defaultChecked={taal === k} /><span>{naam}</span></label>)}
          </div>
        </fieldset>
        <fieldset className="filtergroep">
          <legend>Weergave</legend>
          <div className="keuzes">
            <label className="keuze"><input type="radio" name="weergave" value="" defaultChecked={!breed} /><span>Met mijn filters</span></label>
            <label className="keuze"><input type="radio" name="weergave" value="breed" defaultChecked={breed} /><span>Breed overzicht</span></label>
          </div>
        </fieldset>
        <p className="knoppenrij">
          <button className="knop knop-hoofd">Toon resultaten</button>
          <a className="knop knop-zacht" href={`/ontdekken?r=${r}`}>Wissen</a>
        </p>
      </SchoonFormulier>
    </div>
  );
}

function LeegOverzicht({ lokaal, gebiedNaam, zoek, gefilterd }: { lokaal: boolean; gebiedNaam: string; zoek: string; gefilterd: boolean }) {
  if (zoek) return <p className="leeg">Niets gevonden voor “{zoek}”. Probeer minder woorden, een andere periode of <strong>Alles</strong>. Mis je een onderwerp? <Link href="/mijn-nieuws#interesse">Interesse toevoegen</Link>.</p>;
  if (gefilterd) return <p className="leeg">Geen berichten met deze filters. Haal een filter weg.</p>;
  if (lokaal) return (
    <div className="leeg">
      <p><strong>Beperkte dekking voor {gebiedNaam}.</strong> Er zijn geen berichten gevonden die over dit gebied gaan.</p>
      <p>Dat betekent niet dat er niets gebeurt: NewsZoom volgt hier alleen stadsbrede bronnen automatisch, nog geen wijkkrant of buurtorganisatie. Ken je een bron? Voeg hem hieronder toe.</p>
    </div>
  );
  return <p className="leeg">Geen nieuwe berichten gevonden.</p>;
}

async function BronnenPaneel({ gebiedId, gebiedNaam, terug, status }: { gebiedId: string; gebiedNaam: string; terug: string; status?: string }) {
  const bronnen = await bronnenInGebied(gebiedId);
  return (
    <section className="sectie" id="bronnen">
      <h2>Bronnen in dit gebied</h2>
      <p className="zacht">Welke bronnen NewsZoom voor {gebiedNaam} volgt en wanneer ze voor het laatst zijn gecontroleerd. <Link href="/bronnen">Alle bronnen</Link></p>
      <ul className="bronlijst">
        {bronnen.map((b) => (
          <li key={b.id} className="bronrij">
            <span className="bronrij-naam"><a href={b.url} rel="noopener noreferrer" target="_blank">{b.naam}</a> <span className="label label-zacht">{b.soort === 'journalistiek' || b.soort === 'vakmedium' ? 'Journalistiek' : 'Mededelingen'}</span></span>
            {b.controle === 'ok' && <span className="status">Gecontroleerd {wanneer(b.laatsteControle!)}</span>}
            {b.controle === 'mislukt' && <span className="status status-mislukt">Mislukt {wanneer(b.laatsteControle!)}{b.fout ? ` (${b.fout})` : ''}{b.laatsteSucces ? `; laatst gelukt ${wanneer(b.laatsteSucces)}` : ''}</span>}
            {!b.controle && <span className="status status-geen">Geen werkende feed{b.laatsteBericht ? `; voorbeeldset tot ${wanneer(b.laatsteBericht)}` : ''}</span>}
          </li>
        ))}
      </ul>
      <details className="bron-toevoegen" open={!!status}>
        <summary className="knop knop-klein">Bron toevoegen</summary>
        {status === 'toegevoegd' && <p className="gelukt">Bedankt. Je voorstel is opgeslagen en wordt beoordeeld.</p>}
        {status === 'url' && <p className="fout">Het webadres moet beginnen met http:// of https://.</p>}
        {status === 'leeg' && <p className="fout">Vul een naam in.</p>}
        <form action={bronVoorstellen} className="formulier">
          <input type="hidden" name="gebied" value={gebiedId} />
          <input type="hidden" name="terug" value={terug} />
          <label>Naam<input name="naam" required maxLength={200} placeholder="Bijvoorbeeld een wijkkrant of dorpsblad" /></label>
          <label>Webadres (optioneel)<input name="url" type="url" maxLength={500} placeholder="https://" /></label>
          <label>Toelichting (optioneel)<textarea name="toelichting" maxLength={1000} rows={2} /></label>
          <button className="knop knop-hoofd">Voorstellen</button>
        </form>
      </details>
    </section>
  );
}
