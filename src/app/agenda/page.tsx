import Link from 'next/link';
import { CategorieKnop } from '@/components/agenda-knoppen';
import { AgendaTabs } from '@/components/agenda-tabs';
import { EvenementKaart } from '@/components/evenement-kaart';
import { Kop } from '@/components/kop';
import { PlaatsKeuze } from '@/components/plaats-keuze';
import { agendaBeoordeel, CATEGORIE_NAAM, groep, loopt } from '@/lib/agenda';
import { agenda, agendaKeuzes, vandaagIso } from '@/lib/agenda-data';
import type { EvenementCategorie } from '@/lib/finance-agenda-types';
import { vereisGebruiker } from '@/lib/sessie';

type Zoek = Promise<{ plaats?: string; weergave?: string }>;
const GROEPEN = [{ id: 'vandaag', naam: 'Vandaag' }, { id: 'week', naam: 'Deze week' }, { id: 'later', naam: 'Later' }] as const;

export default async function AgendaPagina({ searchParams }: { searchParams: Zoek }) {
  const z = await searchParams;
  const g = await vereisGebruiker();
  const { evenementen } = agenda();
  const keuzes = await agendaKeuzes(g.id);
  const vandaag = vandaagIso();
  const plaatsen = [...new Set(evenementen.map((e) => e.plaats))].sort();
  const plaats = z.plaats && (z.plaats === 'Nederland' || plaatsen.includes(z.plaats)) ? z.plaats : 'Amsterdam';
  const breed = z.weergave === 'breed';
  const lijst = evenementen
    .filter((e) => plaats === 'Nederland' || e.plaats === plaats || agendaBeoordeel(e, keuzes).gevolgd)
    .filter((e) => breed || agendaBeoordeel(e, keuzes).zichtbaar)
    .sort((a, b) => a.start.localeCompare(b.start));
  const categorieen = [...new Set(evenementen.map((e) => e.categorie))] as EvenementCategorie[];
  const lopend = lijst.filter((e) => loopt(e, vandaag)).sort((a, b) => (a.eind ?? a.start).localeCompare(b.eind ?? b.start));

  return (
    <main className="pagina">
      <Kop titel="Agenda" sub="Wat er binnenkort gebeurt en wat vandaag verstoort" />
      <AgendaTabs actief="agenda" />
      <div className="werkbalk">
        <form action="/agenda" className="zoek">
          <PlaatsKeuze plaatsen={plaatsen} waarde={plaats} />
          {breed && <input type="hidden" name="weergave" value="breed" />}
          <noscript><button className="knop knop-klein">Toon</button></noscript>
        </form>
        <div className="schakel" role="group" aria-label="Weergave">
          <Link href={`/agenda?plaats=${encodeURIComponent(plaats)}`} aria-current={!breed ? 'page' : undefined}>Met mijn filters</Link>
          <Link href={`/agenda?plaats=${encodeURIComponent(plaats)}&weergave=breed`} aria-current={breed ? 'page' : undefined}>Alles</Link>
        </div>
      </div>
      <p className="voorbeeld">Voorbeeldset van 27 november 2026: echte aankondigingen, nog niet automatisch bijgewerkt. Controleer tijden bij de bron.</p>

      <details className="sectie blok">
        <summary><strong>Categorieën</strong> <span className="zacht">(aan/uit; een gevolgd evenement blijft zichtbaar)</span></summary>
        <div className="filters-rij">
          {categorieen.map((c) => {
            const k = keuzes.find((x) => x.doelSoort === 'categorie' && x.doelId === c);
            return (
              <CategorieKnop key={c} id={c} naam={CATEGORIE_NAAM[c]} verborgen={k?.actie === 'verbergen'} />
            );
          })}
        </div>
      </details>

      {GROEPEN.map((gr) => {
        const items = lijst.filter((e) => groep(e, vandaag) === gr.id && !loopt(e, vandaag));
        return (
          <section key={gr.id} className="sectie">
            <h2>{gr.naam}</h2>
            {items.length === 0 ? <p className="leeg">Niets gepland.</p> : items.map((e) => <EvenementKaart key={e.id} e={e} keuzes={keuzes} toonPlaats={plaats === 'Nederland'} />)}
          </section>
        );
      })}

      {lopend.length > 0 && (
        <details className="sectie blok">
          <summary><strong>Loopt nu</strong> <span className="zacht">({lopend.length} tentoonstellingen en meerdaagse evenementen)</span></summary>
          {lopend.map((e) => <EvenementKaart key={e.id} e={e} keuzes={keuzes} toonPlaats={plaats === 'Nederland'} />)}
        </details>
      )}
    </main>
  );
}
