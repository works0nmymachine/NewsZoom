import Link from 'next/link';
import { bronVoorstellen } from '@/app/acties';
import { BerichtKaart } from '@/components/bericht-kaart';
import { Kop, Voorbeeldlabel } from '@/components/kop';
import { bronnenInGebied } from '@/lib/feeds';
import { beoordeel, sorteer } from '@/lib/filters';
import { GEBIEDEN, gebiedVan, noemtGebied } from '@/lib/gebieden';
import type { Item } from '@/lib/inhoud';
import { paginaContext } from '@/lib/pagina';
import { wanneer } from '@/lib/weergave';

type Zoek = Promise<{ r?: string; weergave?: string; q?: string; gebied?: string; bron?: string; n?: string }>;
const REIKWIJDTE = { nederland: 'Nederland', wereld: 'Wereld', lokaal: 'Lokaal' } as const;

export default async function Ontdekken({ searchParams }: { searchParams: Zoek }) {
  const p = await searchParams;
  const { regels, inhoud } = await paginaContext();
  const r = (p.r && p.r in REIKWIJDTE ? p.r : 'nederland') as keyof typeof REIKWIJDTE;
  const breed = p.weergave === 'breed';
  const q = (p.q ?? '').trim().slice(0, 100);
  const gebied = gebiedVan(p.gebied);
  const url = (extra: Record<string, string | undefined>) => {
    const s = new URLSearchParams();
    const alles = { r, weergave: breed ? 'breed' : undefined, q: q || undefined, gebied: r === 'lokaal' ? gebied.id : undefined, ...extra };
    for (const [k, v] of Object.entries(alles)) if (v) s.set(k, v);
    return `/ontdekken?${s}`;
  };
  const hier = url({});

  let items = inhoud.items.filter((i) => i.reikwijdte === r);
  if (r === 'lokaal') items = items.filter((i) => i.gebied === (gebied.ouder ?? gebied.id) && noemtGebied(`${i.titel} ${i.samenvatting}`, gebied));
  if (q) {
    const woorden = q.toLowerCase().split(/\s+/);
    items = items.filter((i) => {
      const t = `${i.titel} ${i.samenvatting} ${i.nieuw ?? ''} ${inhoud.verhalen.get(i.verhaal ?? '')?.titel ?? ''}`.toLowerCase();
      return woorden.every((w) => t.includes(w));
    });
  }
  const gesorteerd = breed
    ? [...items].sort((a, b) => b.belang - a.belang || b.gepubliceerd.localeCompare(a.gepubliceerd))
    : sorteer(items.filter((i) => beoordeel(i, regels).zichtbaar), (i) => beoordeel(i, regels).gewicht);
  const verborgen = items.filter((i) => !beoordeel(i, regels).zichtbaar).length;
  const belangrijk = gesorteerd.filter((i) => i.belang >= 3);
  const overigAlles = gesorteerd.filter((i) => i.belang < 3);
  const aantal = Math.min(500, Math.max(30, Number(p.n) || 30));
  const overig = overigAlles.slice(0, aantal);

  return (
    <main className="pagina">
      <Kop titel="Ontdekken" sub="Belangrijk nieuws, ook buiten wat je volgt" />
      <nav className="segmenten" aria-label="Kies overzicht">
        {Object.entries(REIKWIJDTE).map(([k, naam]) => (
          <Link key={k} href={`/ontdekken?r=${k}${breed ? '&weergave=breed' : ''}`} aria-current={k === r ? 'page' : undefined}>{naam}</Link>
        ))}
      </nav>

      {r === 'lokaal' && (
        <nav className="segmenten segmenten-klein" aria-label="Kies gebied">
          {GEBIEDEN.map((g) => <Link key={g.id} href={url({ gebied: g.id })} aria-current={g.id === gebied.id ? 'page' : undefined}>{g.naam}</Link>)}
        </nav>
      )}

      <div className="werkbalk">
        <div className="schakel" role="group" aria-label="Weergave">
          <Link href={url({ weergave: undefined })} aria-current={!breed ? 'page' : undefined}>Met mijn filters</Link>
          <Link href={url({ weergave: 'breed' })} aria-current={breed ? 'page' : undefined}>Breed overzicht</Link>
        </div>
        <form className="zoek" action="/ontdekken">
          <input type="hidden" name="r" value={r} />
          {breed && <input type="hidden" name="weergave" value="breed" />}
          {r === 'lokaal' && <input type="hidden" name="gebied" value={gebied.id} />}
          <input name="q" defaultValue={q} placeholder="Zoeken in alle berichten" aria-label="Zoeken" />
        </form>
      </div>

      <Voorbeeldlabel peildatum={inhoud.peildatum} />
      {!breed && verborgen > 0 && (
        <p className="melding">{verborgen} {verborgen === 1 ? 'bericht is' : 'berichten zijn'} verborgen door je filters. <Link href={url({ weergave: 'breed' })}>Bekijk in Breed overzicht</Link></p>
      )}

      {r === 'lokaal' && gebied.ouder && gesorteerd.length > 0 && gesorteerd.length < 5 && (
        <p className="melding"><strong>Beperkte dekking voor {gebied.naam}:</strong> {gesorteerd.length} {gesorteerd.length === 1 ? 'bericht noemt' : 'berichten noemen'} dit gebied. Wijkbronnen{gebied.wijkbronnen?.length ? ` zoals ${gebied.wijkbronnen.map((b) => inhoud.bronnen.get(b)?.naam ?? b).join(', ')}` : ''} worden nog niet automatisch gevolgd. <a href="#bronnen">Bron toevoegen</a></p>
      )}
      {gesorteerd.length === 0 && <LeegOverzicht lokaal={r === 'lokaal'} gebiedNaam={gebied.naam} zoek={q} />}

      {belangrijk.length > 0 && <section className="sectie"><h2>Belangrijkste ontwikkelingen</h2>
        {belangrijk.map((i: Item) => <BerichtKaart key={i.id} item={i} inhoud={inhoud} regels={regels} terug={hier} />)}
      </section>}
      {overig.length > 0 && <section className="sectie"><h2>Alle berichten</h2>
        {overig.map((i: Item) => <BerichtKaart key={i.id} item={i} inhoud={inhoud} regels={regels} terug={hier} />)}
        {overigAlles.length > overig.length && <p><Link className="knop" href={`${url({ n: String(aantal + 30) })}`}>Meer berichten ({overigAlles.length - overig.length})</Link></p>}
      </section>}

      {r === 'lokaal' && <BronnenPaneel gebiedId={gebied.ouder ?? gebied.id} gebiedNaam={gebied.naam} terug={hier} status={p.bron} />}
    </main>
  );
}

function LeegOverzicht({ lokaal, gebiedNaam, zoek }: { lokaal: boolean; gebiedNaam: string; zoek: string }) {
  if (zoek) return <p className="leeg">Geen berichten gevonden voor “{zoek}”. Via <strong>Ik mis iets</strong> in <Link href="/mijn-nieuws#interesse">Mijn Nieuws</Link> kun je een onderwerp of bron toevoegen.</p>;
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
      <p className="zacht">Welke bronnen NewsZoom voor {gebiedNaam} volgt en wanneer ze voor het laatst zijn gecontroleerd.</p>
      <ul className="bronlijst">
        {bronnen.map((b) => (
          <li key={b.id}>
            <div><a href={b.url} rel="noopener noreferrer" target="_blank">{b.naam}</a> <span className="label label-zacht">{b.soort === 'journalistiek' || b.soort === 'vakmedium' ? 'Journalistiek' : 'Mededelingen'}</span></div>
            <div className="zacht">
              {b.controle === 'ok' && <>Laatst gecontroleerd {wanneer(b.laatsteControle!)} · gelukt</>}
              {b.controle === 'mislukt' && <span className="fout">Laatste controle {wanneer(b.laatsteControle!)} mislukt{b.fout ? ` (${b.fout})` : ''}{b.laatsteSucces ? `; laatst gelukt ${wanneer(b.laatsteSucces)}` : ''}</span>}
              {!b.controle && (b.laatsteBericht ? <>Geen automatische controle; nieuwste bericht in de voorbeeldset {wanneer(b.laatsteBericht)}</> : <>Geen automatische controle; geen recente berichten gevonden</>)}
            </div>
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
