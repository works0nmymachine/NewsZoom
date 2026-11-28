import Link from 'next/link';
import { interesseWijzig } from '@/app/acties';
import { Icoon } from '@/components/iconen';
import { RegelKnoppen, type Doel } from '@/components/kaart-menu';
import { Kop } from '@/components/kop';
import { alleBronnen } from '@/lib/feeds';
import type { DoelSoort } from '@/lib/filters';
import { interessesVan } from '@/lib/interesses-db';
import { paginaContext } from '@/lib/pagina';

const REIKWIJDTE = { nederland: 'Nederland', wereld: 'Wereld', lokaal: 'Lokaal' } as const;

export default async function Filters() {
  const { gebruiker, regels, inhoud } = await paginaContext();
  const [interesses, bronnen] = await Promise.all([interessesVan(gebruiker.id), alleBronnen()]);
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
      <Kop titel="Mijn filters" sub={`${regels.length} ${regels.length === 1 ? 'keuze' : 'keuzes'} opgeslagen`} terug="/" />
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

      <section className="sectie">
        <div className="sectie-kop"><h2>Eigen interesses</h2><Link href="/mijn-nieuws#interesse">Toevoegen</Link></div>
        {interesses.length === 0 && <p className="zacht">Geen. Voeg bijvoorbeeld een bedrijf of onderwerp toe dat niet in de lijst staat.</p>}
        {interesses.length > 0 && (
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
        )}
      </section>
    </main>
  );
}
