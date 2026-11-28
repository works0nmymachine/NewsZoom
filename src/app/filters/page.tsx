import Link from 'next/link';
import { agendaActie, interesseWijzig, regelActie, watchlistActie } from '@/app/acties';
import { CategorieFilter } from '@/components/categorie-filter';
import { Kop } from '@/components/kop';
import { ALLE_CATEGORIEEN } from '@/lib/agenda';
import { agenda, agendaKeuzes } from '@/lib/agenda-data';
import { finance, watchlistVan } from '@/lib/finance';
import { interessesVan } from '@/lib/interesses-db';
import { paginaContext } from '@/lib/pagina';
import { ACTIE_NAAM, doelNaam } from '@/lib/weergave';

type Zoek = Promise<{ sectie?: string }>;
const SECTIES = { nieuws: 'Nieuws', interesses: 'Eigen interesses', finance: 'Finance', agenda: 'Agenda' } as const;
type Sectie = keyof typeof SECTIES;
const SOORT = { verhaal: 'Verhalen', onderwerp: 'Onderwerpen', bron: 'Bronnen' } as const;

export default async function Filters({ searchParams }: { searchParams: Zoek }) {
  const z = await searchParams;
  const sectie: Sectie = z.sectie && z.sectie in SECTIES ? (z.sectie as Sectie) : 'nieuws';
  const { gebruiker, regels, inhoud } = await paginaContext();
  const [interesses, watch, keuzes] = await Promise.all([interessesVan(gebruiker.id), watchlistVan(gebruiker.id), agendaKeuzes(gebruiker.id)]);
  const aantal: Record<Sectie, number> = {
    nieuws: regels.length,
    interesses: interesses.length,
    finance: watch.size,
    agenda: keuzes.length,
  };
  const terug = `/filters?sectie=${sectie}`;

  return (
    <main className="pagina">
      <Kop titel="Mijn filters" sub="Al je voorkeuren per sectie. Een leesklik verandert hier niets." />
      <nav className="segmenten" aria-label="Kies sectie">
        {(Object.keys(SECTIES) as Sectie[]).map((s) => (
          <Link key={s} href={`/filters?sectie=${s}`} aria-current={s === sectie ? 'page' : undefined}>
            {SECTIES[s]}{aantal[s] ? ` (${aantal[s]})` : ''}
          </Link>
        ))}
      </nav>

      {sectie === 'nieuws' && <>
        {regels.length === 0
          ? <p className="leeg">Geen filters actief. Je ziet alle berichten, gesorteerd op belang en tijd. Kies bij een bericht <strong>Aanpassen</strong> om een verhaal, onderwerp of bron te volgen of te verbergen.</p>
          : (['verhaal', 'onderwerp', 'bron'] as const).map((s) => {
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
                        <input type="hidden" name="terug" value={terug} />
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
        <details className="sectie blok">
          <summary><strong>Zo werken je regels</strong></summary>
          <ul>
            <li>Een keuze voor een specifiek verhaal gaat voor op een onderwerp.</li>
            <li>Bij botsende onderwerpen gaat <strong>Verbergen</strong> voor Meer en Minder.</li>
            <li>Een verborgen bron blijft buiten je gefilterde weergave.</li>
            <li>Verborgen berichten blijven vindbaar in <Link href="/ontdekken?weergave=breed">Breed overzicht</Link>.</li>
          </ul>
        </details>
      </>}

      {sectie === 'interesses' && (
        <section className="sectie">
          {interesses.length === 0 && <p className="leeg">Geen eigen interesses. <Link href="/mijn-nieuws#interesse">Interesse toevoegen</Link></p>}
          {interesses.length > 0 && <ul className="regellijst">
            {interesses.map((i) => (
              <li key={i.id}>
                <form action={interesseWijzig} className="regelrij">
                  <input type="hidden" name="interesse" value={i.id} />
                  <input type="hidden" name="terug" value={terug} />
                  <span className="regelrij-doel">{i.naam} {i.gedempt && <span className="label label-zacht">Gedempt</span>} <span className="zacht">({(i.zoektermen.length ? i.zoektermen : [i.naam]).join(', ')}{i.uitsluitingen.length ? `; niet: ${i.uitsluitingen.join(', ')}` : ''})</span></span>
                  <span className="regelrij-knoppen">
                    <Link className="chip" href={`/mijn-nieuws?interesse=${i.id}#interesse`}>Aanpassen</Link>
                    <button className="chip" name="wat" value={i.gedempt ? 'activeer' : 'demp'}>{i.gedempt ? 'Activeren' : 'Dempen'}</button>
                    <button className="chip chip-zacht" name="wat" value="verwijder">Verwijderen</button>
                  </span>
                </form>
              </li>
            ))}
          </ul>}
          {interesses.length > 0 && <p><Link className="knop knop-klein" href="/mijn-nieuws#interesse">Interesse toevoegen</Link></p>}
        </section>
      )}

      {sectie === 'finance' && (
        <section className="sectie">
          <h2>Watchlist</h2>
          <p className="zacht">Instrumenten op je watchlist staan bovenaan in Finance.</p>
          <ul className="regellijst">
            {finance().instrumenten.map((i) => (
              <li key={i.id}>
                <form action={watchlistActie} className="regelrij">
                  <input type="hidden" name="instrument" value={i.id} />
                  <input type="hidden" name="terug" value={terug} />
                  <span className="regelrij-doel"><Link href={`/finance/${i.id}`}>{i.naam}</Link> {i.ticker && <span className="zacht">{i.ticker}</span>}</span>
                  <span className="regelrij-knoppen">
                    <button className="chip" name="wat" value={watch.has(i.id) ? 'ontvolg' : 'volg'} aria-pressed={watch.has(i.id)}>{watch.has(i.id) ? '✓ Op watchlist' : 'Op watchlist'}</button>
                  </span>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sectie === 'agenda' && <AgendaFilters keuzes={keuzes} terug={terug} />}
    </main>
  );
}

function AgendaFilters({ keuzes, terug }: { keuzes: Awaited<ReturnType<typeof agendaKeuzes>>; terug: string }) {
  const { evenementen } = agenda();
  const aantallen = new Map<string, number>();
  for (const e of evenementen) aantallen.set(e.categorie, (aantallen.get(e.categorie) ?? 0) + 1);
  const titel = (id: string) => evenementen.find((e) => e.id === id || e.hoofdevenement === id)?.titel ?? id;
  const lijst = (soort: 'evenement' | 'locatie') => keuzes.filter((k) => k.doelSoort === soort);
  return (
    <>
      <section className="sectie">
        <h2>Categorieën</h2>
        <p className="zacht">Tik om te verbergen of weer te tonen. Geldt voor Agenda en Uitagenda.</p>
        <CategorieFilter categorieen={ALLE_CATEGORIEEN} keuzes={keuzes} terug={terug} aantallen={aantallen} />
      </section>
      {(['evenement', 'locatie'] as const).map((soort) => (
        <section key={soort} className="sectie">
          <h2>{soort === 'evenement' ? 'Evenementen' : 'Podia en locaties'}</h2>
          {lijst(soort).length === 0
            ? <p className="zacht">Geen. Kies in de agenda bij een {soort === 'evenement' ? 'evenement' : 'podium'} <strong>Volgen</strong> of <strong>Verbergen</strong>.</p>
            : <ul className="regellijst">
              {lijst(soort).map((k) => (
                <li key={k.doelId}>
                  <form action={agendaActie} className="regelrij">
                    <input type="hidden" name="soort" value={soort} />
                    <input type="hidden" name="id" value={k.doelId} />
                    <input type="hidden" name="terug" value={terug} />
                    <span className="regelrij-doel">{soort === 'evenement' ? titel(k.doelId) : k.doelId}</span>
                    <span className="regelrij-knoppen">
                      <button className="chip" name="actie" value="volgen" aria-pressed={k.actie === 'volgen'}>Volgen</button>
                      <button className="chip" name="actie" value="verbergen" aria-pressed={k.actie === 'verbergen'}>Verbergen</button>
                      <button className="chip chip-zacht" name="actie" value="wissen">Verwijderen</button>
                    </span>
                  </form>
                </li>
              ))}
            </ul>}
        </section>
      ))}
      <p className="zacht">Specifieke keuzes gaan voor categorieën: een gevolgd evenement blijft zichtbaar, ook als de categorie uit staat.</p>
    </>
  );
}
