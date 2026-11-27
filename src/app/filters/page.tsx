import Link from 'next/link';
import { interesseWijzig, regelActie } from '@/app/acties';
import { Kop } from '@/components/kop';
import { interessesVan } from '@/lib/interesses-db';
import { paginaContext } from '@/lib/pagina';
import { ACTIE_NAAM, doelNaam } from '@/lib/weergave';

const SOORT = { verhaal: 'Verhalen', onderwerp: 'Onderwerpen', bron: 'Bronnen' } as const;

export default async function Filters() {
  const { gebruiker, regels, inhoud } = await paginaContext();
  const interesses = await interessesVan(gebruiker.id);
  return (
    <main className="pagina">
      <Kop titel="Mijn filters" sub="Alle opgeslagen voorkeuren. Een leesklik verandert hier niets." />
      <section className="sectie blok">
        <h2>Zo werken je regels</h2>
        <ul>
          <li>Een keuze voor een specifiek verhaal gaat voor op een onderwerp.</li>
          <li>Bij botsende onderwerpen gaat <strong>Verbergen</strong> voor Meer en Minder.</li>
          <li>Een verborgen bron blijft buiten je gefilterde weergave.</li>
          <li>Verborgen berichten blijven vindbaar in <Link href="/ontdekken?weergave=breed">Breed overzicht</Link>.</li>
        </ul>
      </section>
      {regels.length === 0 && <p className="leeg">Je hebt nog geen regels. Kies bij een bericht <strong>Aanpassen</strong>.</p>}
      {(['verhaal', 'onderwerp', 'bron'] as const).map((s) => {
        const lijst = regels.filter((r) => r.doelSoort === s);
        if (!lijst.length) return null;
        return (
          <section key={s} className="sectie">
            <h2>{SOORT[s]}</h2>
            <ul className="regellijst">
              {lijst.map((r) => (
                <li key={r.id}>
                  <form action={regelActie} className="regelrij">
                    <input type="hidden" name="soort" value={r.doelSoort} />
                    <input type="hidden" name="id" value={r.doelId} />
                    <input type="hidden" name="terug" value="/filters" />
                    <span className="regelrij-doel">{s === 'verhaal' ? <Link href={`/verhaal/${r.doelId}`}>{doelNaam(r, inhoud)}</Link> : doelNaam(r, inhoud)}</span>
                    <span className="regelrij-knoppen">
                      {(['meer', 'minder', 'verbergen'] as const).map((a) => (
                        <button key={a} name="actie" value={a} className="chip" aria-pressed={r.actie === a}>{ACTIE_NAAM[a]}</button>
                      ))}
                      <button name="actie" value="wissen" className="chip chip-zacht">Verwijderen</button>
                    </span>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <section className="sectie">
        <h2>Eigen interesses</h2>
        {interesses.length === 0 && <p className="zacht">Geen. <Link href="/mijn-nieuws#interesse">Interesse toevoegen</Link></p>}
        <ul className="regellijst">
          {interesses.map((i) => (
            <li key={i.id}>
              <form action={interesseWijzig} className="regelrij">
                <input type="hidden" name="interesse" value={i.id} />
                <input type="hidden" name="terug" value="/filters" />
                <span className="regelrij-doel">{i.naam} <span className="zacht">({(i.zoektermen.length ? i.zoektermen : [i.naam]).join(', ')})</span></span>
                <span className="regelrij-knoppen">
                  <Link className="chip" href={`/mijn-nieuws?interesse=${i.id}#interesse`}>Aanpassen</Link>
                  <button className="chip" name="wat" value={i.gedempt ? 'activeer' : 'demp'}>{i.gedempt ? 'Activeren' : 'Dempen'}</button>
                  <button className="chip chip-zacht" name="wat" value="verwijder">Verwijderen</button>
                </span>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
