import Link from 'next/link';
import { AgendaTabs } from '@/components/agenda-tabs';
import { CategorieFilter } from '@/components/categorie-filter';
import { EvenementKaart } from '@/components/evenement-kaart';
import { Kop } from '@/components/kop';
import { Paneel } from '@/components/paneel';
import { PlaatsKeuze } from '@/components/plaats-keuze';
import { agendaBeoordeel, ALLE_CATEGORIEEN, groep, loopt } from '@/lib/agenda';
import { agenda, agendaKeuzes, vandaagIso } from '@/lib/agenda-data';
import { vereisGebruiker } from '@/lib/sessie';

type Zoek = Promise<{ plaats?: string; weergave?: string }>;
const GROEPEN = [{ id: 'vandaag', naam: 'Vandaag' }, { id: 'week', naam: 'Deze week' }, { id: 'later', naam: 'Later' }] as const;

export default async function AgendaPagina({ searchParams }: { searchParams: Zoek }) {
  const z = await searchParams;
  const g = await vereisGebruiker();
  const evenementen = agenda().evenementen.filter(e => e.categorie === 'verstoring' || e.categorie === 'demonstratie');
  const keuzes = await agendaKeuzes(g.id);
  const vandaag = vandaagIso();
  const plaatsen = [...new Set(evenementen.map((e) => e.plaats))].sort();
  const plaats = z.plaats && (z.plaats === 'Nederland' || plaatsen.includes(z.plaats)) ? z.plaats : 'Amsterdam';
  const breed = z.weergave === 'breed';
  const lijst = evenementen
    .filter((e) => plaats === 'Nederland' || e.plaats === plaats || agendaBeoordeel(e, keuzes).gevolgd)
    .filter((e) => breed || agendaBeoordeel(e, keuzes).zichtbaar)
    .sort((a, b) => a.start.localeCompare(b.start));
  const inPlaats = evenementen.filter((e) => plaats === 'Nederland' || e.plaats === plaats);
  const aantallen = new Map<string, number>();
  for (const e of inPlaats) aantallen.set(e.categorie, (aantallen.get(e.categorie) ?? 0) + 1);
  const categorieen = ALLE_CATEGORIEEN.filter((c) => aantallen.has(c) || keuzes.some((k) => k.doelSoort === 'categorie' && k.doelId === c));
  const verborgen = inPlaats.filter((e) => !agendaBeoordeel(e, keuzes).zichtbaar).length;
  const lopend = lijst.filter((e) => loopt(e, vandaag)).sort((a, b) => (a.eind ?? a.start).localeCompare(b.eind ?? b.start));

  return (
    <main className="pagina met-agendadock">
      <Kop titel="Bereikbaarheid" sub="Verstoringen en demonstraties" />
      <p className="voorbeeld">Voorbeeldset van 27 november 2026: echte aankondigingen, nog niet automatisch bijgewerkt. Controleer tijden bij de bron.</p>

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
      <div className="agenda-dock">      <AgendaTabs actief="agenda" />
      <div className="agenda-dock-knoppen"><div><Paneel titel="Locatie en weergave" icoon="filter" label="Locatie en weergave"><div className="werkbalk">
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
</Paneel><span>{plaats}</span></div><div><Paneel titel="Categorieën" icoon="filter" label="Categorieën">      <section className="sectie" aria-label="Categorieën">
        <p className="zacht" style={{ margin: 0 }}>Tik op een categorie om hem te verbergen of weer te tonen. Een gevolgd evenement blijft altijd zichtbaar.</p>
        <CategorieFilter categorieen={categorieen} keuzes={keuzes} aantallen={aantallen} />
        {keuzes.length === 0
          ? <p className="zacht">Geen filters actief: je ziet alles.</p>
          : !breed && verborgen > 0 && <p className="melding">{verborgen} {verborgen === 1 ? 'item is' : 'items zijn'} verborgen door je keuzes. <Link href={`/agenda?plaats=${encodeURIComponent(plaats)}&weergave=breed`}>Toon alles</Link> · <Link href="/filters?sectie=agenda">Agendafilters</Link></p>}
      </section>

</Paneel><span>Filters</span></div></div></div>
    </main>
  );
}
