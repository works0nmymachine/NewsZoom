import Link from 'next/link';
import { agendaActie } from '@/app/acties';
import { AgendaTabs } from '@/components/agenda-tabs';
import { EvenementKaart } from '@/components/evenement-kaart';
import { Kop } from '@/components/kop';
import { agendaBeoordeel, CATEGORIE_NAAM, groep } from '@/lib/agenda';
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
  const hier = `/agenda?plaats=${encodeURIComponent(plaats)}${breed ? '&weergave=breed' : ''}`;
  const lijst = evenementen
    .filter((e) => plaats === 'Nederland' || e.plaats === plaats || agendaBeoordeel(e, keuzes).gevolgd)
    .filter((e) => breed || agendaBeoordeel(e, keuzes).zichtbaar)
    .sort((a, b) => a.start.localeCompare(b.start));
  const categorieen = [...new Set(evenementen.map((e) => e.categorie))] as EvenementCategorie[];

  return (
    <main className="pagina">
      <Kop titel="Agenda" sub="Wat er binnenkort gebeurt en wat vandaag verstoort" />
      <AgendaTabs actief="agenda" />
      <div className="werkbalk">
        <form action="/agenda" className="zoek">
          <select name="plaats" defaultValue={plaats} aria-label="Plaats">
            <option value="Nederland">Heel Nederland</option>
            {plaatsen.map((p) => <option key={p}>{p}</option>)}
          </select>
          {breed && <input type="hidden" name="weergave" value="breed" />}
          <button className="knop knop-klein">Toon</button>
        </form>
        <div className="schakel" role="group" aria-label="Weergave">
          <Link href={`/agenda?plaats=${encodeURIComponent(plaats)}`} aria-current={!breed ? 'page' : undefined}>Met mijn filters</Link>
          <Link href={`/agenda?plaats=${encodeURIComponent(plaats)}&weergave=breed`} aria-current={breed ? 'page' : undefined}>Alles</Link>
        </div>
      </div>
      <p className="voorbeeld">Voorbeeldset: echte aankondigingen, handmatig verzameld op 27 november 2026. Controleer tijden altijd bij de bron.</p>

      <details className="sectie blok">
        <summary><strong>Categorieën</strong> <span className="zacht">(aan/uit; een gevolgd evenement blijft zichtbaar)</span></summary>
        <div className="filters-rij">
          {categorieen.map((c) => {
            const k = keuzes.find((x) => x.doelSoort === 'categorie' && x.doelId === c);
            return (
              <form key={c} action={agendaActie}>
                <input type="hidden" name="soort" value="categorie" />
                <input type="hidden" name="id" value={c} />
                <input type="hidden" name="terug" value={hier} />
                <button className="chip" name="actie" value={k?.actie === 'verbergen' ? 'wissen' : 'verbergen'} aria-pressed={k?.actie !== 'verbergen'}>
                  {k?.actie === 'verbergen' ? '○' : '●'} {CATEGORIE_NAAM[c]}
                </button>
              </form>
            );
          })}
        </div>
      </details>

      {GROEPEN.map((gr) => {
        const items = lijst.filter((e) => groep(e, vandaag) === gr.id);
        return (
          <section key={gr.id} className="sectie">
            <h2>{gr.naam}</h2>
            {items.length === 0 ? <p className="leeg">Niets gepland.</p> : items.map((e) => <EvenementKaart key={e.id} e={e} keuzes={keuzes} terug={hier} toonPlaats={plaats === 'Nederland'} />)}
          </section>
        );
      })}
    </main>
  );
}
