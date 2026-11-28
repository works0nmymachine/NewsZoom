import Link from 'next/link';
import { bronToevoegen, bronWijzig } from '@/app/acties';
import { PROVIDER_NAAM } from '@/components/ai-instellingen';
import { RegelKnoppen } from '@/components/kaart-menu';
import { Kop } from '@/components/kop';
import { kiesProvider } from '../../../scripts/achtergrond.mjs';
import { achtergrondDomeinen, DOELEN, doelVanFeed, FEED_DOELEN, feedBronnenMetStatus, koersBronnen, vasteBronnen, type Doel, type FeedBronRij } from '@/lib/bronnen';
import { pool } from '@/lib/db';
import { alleBronnen, ingestRondes, versheid } from '@/lib/feeds';
import { paginaContext } from '@/lib/pagina';
import { tijd, wanneer } from '@/lib/weergave';

export const metadata = { title: 'Bronnen · NewsZoom' };

const SOORT: Record<string, string> = { journalistiek: 'Journalistiek', vakmedium: 'Vakmedium', bedrijf: 'Bedrijf', overheid: 'Overheid', organisatie: 'Organisatie' };

/** Welke bronnen NewsZoom volgt, of ze werken, en wat er bij de laatste ophaalrondes gebeurde. */
const MELDING: Record<string, { tekst: (n: string) => string; fout?: boolean }> = {
  toegevoegd: { tekst: (n) => `Bron toegevoegd. ${n} ${n === '1' ? 'bericht' : 'berichten'} opgehaald; daarna elke 20 minuten.` },
  leeg: { tekst: () => 'Feed gevonden en toegevoegd, maar er stonden nog geen (nieuwe) berichten in.' },
  voorstel: { tekst: () => 'Geen automatisch te volgen feed gevonden. De bron is als voorstel bewaard.' },
  bestaat: { tekst: () => 'Deze feed wordt al gevolgd.', fout: true },
  geweigerd: { tekst: () => 'Dit adres is niet toegestaan (alleen publieke websites via http of https, standaardpoort).', fout: true },
  onbereikbaar: { tekst: () => 'De website reageerde niet of gaf een fout. Controleer het adres.', fout: true },
  url: { tekst: () => 'Het webadres moet beginnen met http:// of https://.', fout: true },
};

export default async function Bronnen({ searchParams }: { searchParams: Promise<{ doel?: string; bron?: string; n?: string }> }) {
  const z = await searchParams;
  const { regels, inhoud } = await paginaContext();
  const [bronnen, rondes, vers, feeds, koersen, domeinen, ai] = await Promise.all([
    alleBronnen(), ingestRondes(80), versheid(), feedBronnenMetStatus(), koersBronnen(), achtergrondDomeinen(),
    kiesProvider(pool()).catch(() => null),
  ]);
  const vast = vasteBronnen();
  const zonderFeed = bronnen.filter((b) => !b.reikwijdte && b.gebied);
  const laatste = rondes[0];
  const nu = new Date();
  const nieuw24 = rondes.filter((r) => nu.getTime() - new Date(r.gestart).getTime() < 86_400_000).reduce((s, r) => s + r.nieuw, 0);
  const huidig = (id: string) => regels.find((r) => r.doelSoort === 'bron' && r.doelId === id)?.actie ?? null;

  return (
    <main className="pagina">
      <Kop titel="Bronnen" sub="Wat NewsZoom volgt en of het werkt" versheid={vers} terug="/" />
      <section className="blok samenvatting-rij">
        <div><strong>{vers.ok} van {vers.bronnen}</strong><span className="zacht">feeds werken</span></div>
        <div><strong>{laatste ? tijd(laatste.gestart) : '–'}</strong><span className="zacht">laatste ophaalronde</span></div>
        <div><strong>{nieuw24}</strong><span className="zacht">nieuwe berichten in 24 uur</span></div>
      </section>
      <p className="zacht">De ingest-worker haalt elke 20 minuten alle feeds op. Berichten staan 7 dagen in de app. Samenvattingen komen van de bron zelf; NewsZoom linkt altijd naar het origineel.</p>
      <nav className="segmenten segmenten-klein" aria-label="Doelen">
        {(Object.keys(DOELEN) as Doel[]).map((d) => <a key={d} href={`#bronnen-${d}`}>{DOELEN[d].naam}</a>)}
      </nav>

      {(Object.keys(DOELEN) as Doel[]).map((d) => {
        const lijst = feeds.filter((b) => doelVanFeed(b) === d);
        const melding = z.doel === d && z.bron ? MELDING[z.bron] : undefined;
        return (
          <section key={d} className="sectie" id={`bronnen-${d}`}>
            <h2>{DOELEN[d].naam}{FEED_DOELEN.includes(d) && <span className="zacht" style={{ fontWeight: 400 }}> ({lijst.length})</span>}</h2>
            <p className="zacht">{DOELEN[d].uitleg}</p>
            {melding && <p className={melding.fout ? 'fout' : 'gelukt'}>{melding.tekst(z.n ?? '0')}</p>}

            {FEED_DOELEN.includes(d) && (lijst.length
              ? <ul className="bronlijst">{lijst.map((b) => <FeedRij key={b.id} b={b} doel={d} huidig={huidig(b.id)} />)}</ul>
              : <p className="zacht">Nog geen automatisch gevolgde bronnen.</p>)}

            {d === 'finance' && (
              <div className="blok">
                <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Koersen</h3>
                {koersen.length === 0 ? <p className="zacht">Nog geen koersen opgehaald; de app gebruikt de momentopname.</p> : (
                  <ul className="bronlijst">{koersen.map((k) => (
                    <li key={k.reeks} className="bronrij">
                      <span className="bronrij-naam"><strong>{k.reeks.toUpperCase()}</strong> via {k.bron}</span>
                      {k.laatste_controle
                        ? <span className={`status${k.laatste_fout ? ' status-mislukt' : ''}`}>{k.laatste_fout ? `Mislukt (${k.laatste_fout})` : `Gecontroleerd ${wanneer(k.laatste_controle.toISOString())}`}</span>
                        : <span className="status status-geen">Nog niet gecontroleerd</span>}
                    </li>
                  ))}</ul>
                )}
                <p className="zacht" style={{ marginBottom: 0 }}>Handmatig verzameld (voorbeeldset): {vast.finance.map((b) => b.naam).join(', ')}.</p>
              </div>
            )}

            {d === 'agenda' && (
              <details className="blok">
                <summary>{vast.agenda.length} bronnen in de voorbeeldset</summary>
                <ul className="zacht">{vast.agenda.map((b) => <li key={b.naam}><a href={b.url} rel="noopener noreferrer" target="_blank">{b.naam}</a> ({b.aantal})</li>)}</ul>
              </details>
            )}

            {d === 'achtergrond' && (
              <div className="blok">
                <p style={{ marginTop: 0 }}>Zoekt via {ai ? `${PROVIDER_NAAM[ai.provider]} (${ai.model})` : 'het taalmodel uit Instellingen (nu niet ingesteld)'}; maximaal 8 zoekopdrachten per achtergrond. Het model krijgt ook de berichten die NewsZoom al bij het verhaal heeft. <Link href="/instellingen#ai">AI en budget</Link></p>
                {domeinen.length > 0
                  ? <p className="zacht" style={{ marginBottom: 0 }}>Meest gebruikt in eerdere achtergronden: {domeinen.map((x) => `${x.domein} (${x.aantal})`).join(', ')}.</p>
                  : <p className="zacht" style={{ marginBottom: 0 }}>Nog geen automatische achtergronden gemaakt.</p>}
              </div>
            )}

            {d !== 'achtergrond' && (
              <details className="bron-toevoegen" open={!!melding?.fout}>
                <summary className="knop knop-klein">{FEED_DOELEN.includes(d) ? 'Bron toevoegen' : 'Bron voorstellen'}</summary>
                <form action={bronToevoegen} className="formulier">
                  <input type="hidden" name="doel" value={d} />
                  <label>Webadres<input name="url" type="url" required maxLength={500} placeholder="https://www.voorbeeld.nl of de feed zelf" /></label>
                  <label>Naam (optioneel)<input name="naam" maxLength={200} /></label>
                  <p className="zacht" style={{ margin: 0 }}>{FEED_DOELEN.includes(d)
                    ? 'NewsZoom zoekt de RSS- of Atom-feed van de site en haalt direct de eerste berichten op. Zonder feed wordt het een voorstel.'
                    : 'Wordt bewaard als voorstel; de agenda haalt nog niet automatisch op.'}</p>
                  <button className="knop knop-hoofd">{FEED_DOELEN.includes(d) ? 'Toevoegen' : 'Voorstellen'}</button>
                </form>
              </details>
            )}
          </section>
        );
      })}

      {zonderFeed.length > 0 && (
        <section className="sectie">
          <h2>Zonder werkende feed</h2>
          <p className="zacht">Deze bronnen staan in de voorbeeldset maar hebben geen feed die NewsZoom kan ophalen. Zie docs/BRONNEN.md.</p>
          <ul className="bronlijst">
            {zonderFeed.map((b) => (
              <li key={b.id} className="bronrij">
                <span className="bronrij-naam"><a href={b.url} rel="noopener noreferrer" target="_blank">{b.naam}</a> <span className="label label-zacht">{SOORT[b.soort] ?? b.soort}</span></span>
                <span className="status status-geen">Geen feed{b.laatsteBericht ? ` · voorbeeldset tot ${wanneer(b.laatsteBericht)}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="sectie">
        <details className="blok">
          <summary><strong>Laatste ophaalrondes</strong> <span className="zacht">(laatste {Math.min(12, rondes.length)})</span></summary>
          {rondes.length === 0 ? <p className="zacht">Nog geen rondes vastgelegd.</p> : (
            <table className="tabel" style={{ marginTop: '0.5rem' }}>
              <thead><tr><th>Start</th><th className="getal">Gelukt</th><th className="getal">Mislukt</th><th className="getal">Nieuw</th></tr></thead>
              <tbody>
                {rondes.slice(0, 12).map((r) => (
                  <tr key={r.gestart}>
                    <td>{wanneer(r.gestart)}{!r.klaar && <span className="label label-zacht">bezig</span>}{r.fouten.length > 0 && <div className="zacht" style={{ fontSize: '0.8rem' }}>{r.fouten.map((f) => `${inhoud.bronnen.get(f.bron)?.naam ?? f.bron}: ${f.fout}`).join('; ')}</div>}</td>
                    <td className="getal">{r.gelukt}</td><td className={`getal${r.mislukt ? ' fout' : ''}`}>{r.mislukt}</td><td className="getal">{r.nieuw}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </details>
      </section>

      <p className="zacht">Mis je een onderwerp in plaats van een bron? Volg het met een <Link href="/mijn-nieuws#interesse">eigen interesse</Link>.</p>
    </main>
  );
}

function FeedRij({ b, doel, huidig }: { b: FeedBronRij; doel: Doel; huidig: 'meer' | 'minder' | 'verbergen' | null }) {
  return (
    <li className="bron-grid">
      <span className="bronrij-naam">
        <a href={b.homepage} rel="noopener noreferrer" target="_blank">{b.naam}</a>{' '}
        <span className="label label-zacht">{SOORT[b.soort] ?? b.soort}</span>{' '}
        {b.taal === 'en' && <span className="label label-zacht">EN</span>}
        {b.herkomst === 'gebruiker' && <span className="label label-zacht">Toegevoegd</span>}
        {b.gepauzeerd && <span className="label">Gepauzeerd</span>}
      </span>
      {b.laatste_controle
        ? (b.laatste_fout
          ? <span className="status status-mislukt">Mislukt ({b.laatste_fout}){b.laatste_succes ? ` · laatst gelukt ${wanneer(b.laatste_succes.toISOString())}` : ' · nooit gelukt'}</span>
          : <span className="status">{b.items_7d} berichten · {wanneer(b.laatste_controle.toISOString())}</span>)
        : <span className="status status-geen">Nog niet gecontroleerd</span>}
      <RegelKnoppen doelen={[{ soort: 'bron', id: b.id, naam: b.naam, huidig }]} compact />
      <form action={bronWijzig} className="bron-beheer">
        <input type="hidden" name="id" value={b.id} />
        <input type="hidden" name="doel" value={doel} />
        <button className="chip chip-zacht" name="wat" value={b.gepauzeerd ? 'hervat' : 'pauzeer'}>{b.gepauzeerd ? 'Ophalen hervatten' : 'Ophalen pauzeren'}</button>
        {b.herkomst === 'gebruiker' && <button className="chip chip-zacht" name="wat" value="verwijder">Verwijderen</button>}
      </form>
    </li>
  );
}
