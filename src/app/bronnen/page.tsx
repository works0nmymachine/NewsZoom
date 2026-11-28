import Link from 'next/link';
import { RegelKnoppen } from '@/components/kaart-menu';
import { Kop } from '@/components/kop';
import { alleBronnen, ingestRondes, versheid, type BronStatus } from '@/lib/feeds';
import { paginaContext } from '@/lib/pagina';
import { tijd, wanneer } from '@/lib/weergave';

export const metadata = { title: 'Bronnen · NewsZoom' };

const REIKWIJDTE = { nederland: 'Nederland', wereld: 'Wereld', lokaal: 'Lokaal' } as const;
const SOORT: Record<string, string> = { journalistiek: 'Journalistiek', vakmedium: 'Vakmedium', bedrijf: 'Bedrijf', overheid: 'Overheid', organisatie: 'Organisatie' };

/** Welke bronnen NewsZoom volgt, of ze werken, en wat er bij de laatste ophaalrondes gebeurde. */
export default async function Bronnen() {
  const { regels, inhoud } = await paginaContext();
  const [bronnen, rondes, vers] = await Promise.all([alleBronnen(), ingestRondes(80), versheid()]);
  const feeds = bronnen.filter((b) => b.reikwijdte);
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

      {(Object.keys(REIKWIJDTE) as (keyof typeof REIKWIJDTE)[]).map((r) => {
        const lijst = feeds.filter((b) => b.reikwijdte === r);
        if (!lijst.length) return null;
        return (
          <section key={r} className="sectie">
            <h2>{REIKWIJDTE[r]} <span className="zacht" style={{ fontWeight: 400 }}>({lijst.length})</span></h2>
            <ul className="bronlijst">{lijst.map((b) => <BronRij key={b.id} b={b} huidig={huidig(b.id)} />)}</ul>
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

      <p className="zacht">Mis je een bron? Lokale bronnen stel je voor bij <Link href="/ontdekken?r=lokaal#bronnen">Ontdekken → Lokaal</Link>; een onderwerp volg je met een <Link href="/mijn-nieuws#interesse">eigen interesse</Link>.</p>
    </main>
  );
}

function BronRij({ b, huidig }: { b: BronStatus; huidig: 'meer' | 'minder' | 'verbergen' | null }) {
  return (
    <li className="bron-grid">
      <span className="bronrij-naam">
        <a href={b.url} rel="noopener noreferrer" target="_blank">{b.naam}</a>{' '}
        <span className="label label-zacht">{SOORT[b.soort] ?? b.soort}</span>{' '}
        {b.taal === 'en' && <span className="label label-zacht">EN</span>}
      </span>
      {b.controle === 'ok' && <span className="status">{b.berichten7d} berichten · {wanneer(b.laatsteControle!)}</span>}
      {b.controle === 'mislukt' && <span className="status status-mislukt">Mislukt{b.fout ? ` (${b.fout})` : ''}{b.laatsteSucces ? ` · laatst gelukt ${wanneer(b.laatsteSucces)}` : ' · nooit gelukt'}</span>}
      {!b.controle && <span className="status status-geen">Nog niet gecontroleerd</span>}
      <RegelKnoppen doelen={[{ soort: 'bron', id: b.id, naam: b.naam, huidig }]} compact />
    </li>
  );
}
