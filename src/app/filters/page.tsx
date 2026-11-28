import Link from 'next/link';
import { interesseWijzig, watchlistActie } from '@/app/acties';
import { AgendaKnop } from '@/components/agenda-knoppen';
import { CategorieFilter } from '@/components/categorie-filter';
import { Icoon } from '@/components/iconen';
import { RegelKnoppen, type Doel } from '@/components/kaart-menu';
import { Kop } from '@/components/kop';
import { ALLE_CATEGORIEEN, type AgendaKeuze } from '@/lib/agenda';
import { agenda, agendaKeuzes } from '@/lib/agenda-data';
import { alleBronnen } from '@/lib/feeds';
import { finance, watchlistVan } from '@/lib/finance';
import type { DoelSoort } from '@/lib/filters';
import { interessesVan } from '@/lib/interesses-db';
import { paginaContext } from '@/lib/pagina';

const REIKWIJDTE = { nederland: 'Nederland', wereld: 'Wereld', lokaal: 'Lokaal' } as const;
const SECTIES = { nieuws: 'Nieuws', interesses: 'Eigen interesses', finance: 'Finance', agenda: 'Agenda' } as const;
type Sectie = keyof typeof SECTIES;

export default async function Filters({ searchParams }: { searchParams: Promise<{ sectie?: string }> }) {
  const z = await searchParams;
  const sectie: Sectie = z.sectie && z.sectie in SECTIES ? (z.sectie as Sectie) : 'nieuws';
  const { gebruiker, regels, inhoud } = await paginaContext();
  const [interesses, bronnen, watch, keuzes] = await Promise.all([
    interessesVan(gebruiker.id), alleBronnen(), watchlistVan(gebruiker.id), agendaKeuzes(gebruiker.id),
  ]);
  const aantal: Record<Sectie, number> = { nieuws: regels.length, interesses: interesses.length, finance: watch.size, agenda: keuzes.length };
  const terug = `/filters?sectie=${sectie}`;
  const huidig = (soort: DoelSoort, id: string) => regels.find((r) => r.doelSoort === soort && r.doelId === id)?.actie ?? null;

  const onderwerpen: Doel[] = [...inhoud.onderwerpen.values()].sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))
    .map((o) => ({ soort: 'onderwerp', id: o.id, naam: o.naam, huidig: huidig('onderwerp', o.id) }));
  const feedBronnen = bronnen.filter((b) => b.reikwijdte);
  const andereBronRegels = regels.filter((r) => r.doelSoort === 'bron' && !feedBronnen.some((b) => b.id === r.doelId));
  const verhalen = [...inhoud.verhalen.values()];
  const metRegel = verhalen.filter((v) => huidig('verhaal', v.id));
  const zonderRegel = verhalen.filter((v) => !huidig('verhaal', v.id));
  const verhaalDoel = (v: (typeof verhalen)[number]): Doel => ({ soort: 'verhaal', id: v.id, naam: v.titel, huidig: huidig('verhaal', v.id) });

  return (
    <main className="pagina">
      <Kop titel="Mijn filters" sub="Je voorkeuren per sectie" terug="/" />
      <nav className="segmenten" aria-label="Kies sectie">
        {(Object.keys(SECTIES) as Sectie[]).map((x) => (
          <Link key={x} href={`/filters?sectie=${x}`} aria-current={x === sectie ? 'page' : undefined}>
            {SECTIES[x]}{aantal[x] ? ` (${aantal[x]})` : ''}
          </Link>
        ))}
      </nav>

      {sectie === 'nieuws' && <>
      {regels.length === 0 && <p className="leeg">Geen filters actief. Je ziet alle berichten, gesorteerd op actualiteit en belang. Stel hieronder onderwerpen, bronnen of verhalen in.</p>}
      <details className="uitleg">
        <summary><Icoon naam="info" grootte={16} />Zo werken je keuzes</summary>
        <div className="uitleg-tekst">
          <ul>
            <li><strong>Meer</strong> zet berichten hoger en in Mijn Nieuws. <strong>Minder</strong> zet ze lager. <strong>Verbergen</strong> haalt ze uit je gefilterde weergave.</li>
            <li>Een keuze voor een verhaal gaat voor op een onderwerp. Bij botsende onderwerpen wint Verbergen. Een verborgen bron blijft verborgen.</li>
            <li>Verborgen berichten blijven vindbaar met zoeken en in Ontdekken → Filters → Breed overzicht.</li>
            <li>Lezen verandert je keuzes niet. Tik nog eens op een gekozen knop om de keuze te wissen.</li>
          </ul>
        </div>
      </details>

      <section className="sectie">
        <div className="sectie-kop"><h2>Onderwerpen</h2><Link href="/start">Opnieuw instellen</Link></div>
        <p className="zacht">Feedberichten krijgen een onderwerp op trefwoorden; niet elk bericht heeft er een.</p>
        <div className="blok"><RegelKnoppen doelen={onderwerpen} toonSoort={false} /></div>
      </section>

      <section className="sectie">
        <div className="sectie-kop"><h2>Bronnen</h2><Link href="/bronnen">Status van bronnen</Link></div>
        {(Object.keys(REIKWIJDTE) as (keyof typeof REIKWIJDTE)[]).map((r) => {
          const lijst = feedBronnen.filter((b) => b.reikwijdte === r);
          if (!lijst.length) return null;
          return (
            <details key={r} className="blok" style={{ marginBottom: '0.5rem' }} open={lijst.some((b) => huidig('bron', b.id))}>
              <summary><strong>{REIKWIJDTE[r]}</strong> <span className="zacht">({lijst.length} bronnen{lijst.some((b) => huidig('bron', b.id)) ? `, ${lijst.filter((b) => huidig('bron', b.id)).length} met keuze` : ''})</span></summary>
              <RegelKnoppen doelen={lijst.map((b) => ({ soort: 'bron', id: b.id, naam: `${b.naam}${b.taal === 'en' ? ' (EN)' : ''}`, huidig: huidig('bron', b.id) }))} toonSoort={false} />
            </details>
          );
        })}
        {andereBronRegels.length > 0 && (
          <div className="blok"><RegelKnoppen doelen={andereBronRegels.map((r) => ({ soort: 'bron', id: r.doelId, naam: inhoud.bronnen.get(r.doelId)?.naam ?? r.doelId, huidig: r.actie }))} toonSoort={false} /></div>
        )}
      </section>

      <section className="sectie">
        <h2>Verhalen</h2>
        {metRegel.length > 0
          ? <div className="blok"><RegelKnoppen doelen={metRegel.map(verhaalDoel)} toonSoort={false} /></div>
          : <p className="zacht">Nog geen keuze voor een verhaal.</p>}
        <details className="blok" style={{ marginTop: '0.5rem' }}>
          <summary><strong>Alle lopende verhalen</strong> <span className="zacht">({zonderRegel.length})</span></summary>
          <RegelKnoppen doelen={zonderRegel.map(verhaalDoel)} toonSoort={false} />
        </details>
      </section>

      </>}

      {sectie === 'interesses' && <section className="sectie">
        <div className="sectie-kop"><h2>Eigen interesses</h2><Link href="/mijn-nieuws#interesse">Toevoegen</Link></div>
        {interesses.length === 0 && <p className="zacht">Geen. Voeg bijvoorbeeld een bedrijf of onderwerp toe dat niet in de lijst staat.</p>}
        {interesses.length > 0 && (
          <ul className="regellijst">
            {interesses.map((i) => (
              <li key={i.id}>
                <form action={interesseWijzig} className="regelrij">
                  <input type="hidden" name="interesse" value={i.id} />
                  <input type="hidden" name="terug" value={terug} />
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
        )}
      </section>}

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
                    <button className="chip" name="wat" value={watch.has(i.id) ? 'stop' : 'volg'} aria-pressed={watch.has(i.id)}>{watch.has(i.id) ? '★ Op watchlist' : '☆ Op watchlist'}</button>
                  </span>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sectie === 'agenda' && <AgendaFilters keuzes={keuzes} />}
    </main>
  );
}

function AgendaFilters({ keuzes }: { keuzes: AgendaKeuze[] }) {
  const { evenementen } = agenda();
  const aantallen = new Map<string, number>();
  for (const e of evenementen) aantallen.set(e.categorie, (aantallen.get(e.categorie) ?? 0) + 1);
  const titel = (id: string) => evenementen.find((e) => e.id === id || e.hoofdevenement === id)?.titel ?? id;
  return (
    <>
      <section className="sectie">
        <h2>Categorieën</h2>
        <p className="zacht">Tik om te verbergen of weer te tonen. Geldt voor Agenda en Uitagenda.</p>
        <CategorieFilter categorieen={ALLE_CATEGORIEEN} keuzes={keuzes} aantallen={aantallen} />
      </section>
      {(['evenement', 'locatie'] as const).map((soort) => {
        const lijst = keuzes.filter((k) => k.doelSoort === soort);
        return (
          <section key={soort} className="sectie">
            <h2>{soort === 'evenement' ? 'Evenementen' : 'Podia en locaties'}</h2>
            {lijst.length === 0
              ? <p className="zacht">Geen. Kies in de agenda bij een {soort === 'evenement' ? 'evenement' : 'podium (via ⋯)'} <strong>Volgen</strong> of <strong>Verbergen</strong>.</p>
              : <ul className="regellijst">
                {lijst.map((k) => {
                  const naam = soort === 'evenement' ? titel(k.doelId) : k.doelId;
                  return (
                    <li key={k.doelId} className="regelrij">
                      <span className="regelrij-doel">{naam}</span>
                      <span className="regelrij-knoppen">
                        <AgendaKnop soort={soort} id={k.doelId} naam={naam} actie="volgen" huidig={k.actie} tekst="Volgen" aanTekst="Gevolgd" />
                        <AgendaKnop soort={soort} id={k.doelId} naam={naam} actie="verbergen" huidig={k.actie} tekst="Verbergen" aanTekst="Verborgen" zacht />
                      </span>
                    </li>
                  );
                })}
              </ul>}
          </section>
        );
      })}
      <p className="zacht">Specifieke keuzes gaan voor categorieën: een gevolgd evenement blijft zichtbaar, ook als de categorie uit staat.</p>
    </>
  );
}
