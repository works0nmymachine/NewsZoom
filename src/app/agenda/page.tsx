import Link from 'next/link';
import { AgendaTabs } from '@/components/agenda-tabs';
import { CategorieFilter } from '@/components/categorie-filter';
import { EvenementKaart } from '@/components/evenement-kaart';
import { Kop } from '@/components/kop';
import { agendaBeoordeel, ALLE_CATEGORIEEN, groep } from '@/lib/agenda';
import { agenda, agendaKeuzes, vandaagIso } from '@/lib/agenda-data';
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
  const inPlaats = evenementen.filter((e) => plaats === 'Nederland' || e.plaats === plaats);
  const aantallen = new Map<string, number>();
  for (const e of inPlaats) aantallen.set(e.categorie, (aantallen.get(e.categorie) ?? 0) + 1);
  const categorieen = ALLE_CATEGORIEEN.filter((c) => aantallen.has(c) || keuzes.some((k) => k.doelSoort === 'categorie' && k.doelId === c));
  const verborgen = inPlaats.filter((e) => !agendaBeoordeel(e, keuzes).zichtbaar).length;

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

      <section className="sectie" aria-label="Categorieën">
        <p className="zacht" style={{ margin: 0 }}>Tik op een categorie om hem te verbergen of weer te tonen. Een gevolgd evenement blijft altijd zichtbaar.</p>
        <CategorieFilter categorieen={categorieen} keuzes={keuzes} terug={hier} aantallen={aantallen} />
        {keuzes.length === 0
          ? <p className="zacht">Geen filters actief: je ziet alles.</p>
          : !breed && verborgen > 0 && <p className="melding">{verborgen} {verborgen === 1 ? 'item is' : 'items zijn'} verborgen door je keuzes. <Link href={`/agenda?plaats=${encodeURIComponent(plaats)}&weergave=breed`}>Toon alles</Link> · <Link href="/filters?sectie=agenda">Agendafilters</Link></p>}
      </section>

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
