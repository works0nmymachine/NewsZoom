import Link from 'next/link';
import { AgendaTabs } from '@/components/agenda-tabs';
import { EvenementKaart } from '@/components/evenement-kaart';
import { Icoon } from '@/components/iconen';
import { Kop } from '@/components/kop';
import { PlaatsKeuze } from '@/components/plaats-keuze';
import { agendaBeoordeel, CATEGORIE_NAAM, inPeriode, LOCATIETYPE_NAAM, zoekScore, type Periode } from '@/lib/agenda';
import { agenda, agendaKeuzes, vandaagIso } from '@/lib/agenda-data';
import type { EvenementCategorie } from '@/lib/finance-agenda-types';
import { vereisGebruiker } from '@/lib/sessie';

type Zoek = Promise<{ plaats?: string; periode?: string; cat?: string; type?: string; gratis?: string; q?: string }>;
const PERIODES: { id: Periode; naam: string }[] = [{ id: 'vandaag', naam: 'Vandaag' }, { id: 'week', naam: 'Deze week' }, { id: 'maand', naam: 'Deze maand' }];

export default async function Uitagenda({ searchParams }: { searchParams: Zoek }) {
  const z = await searchParams;
  const g = await vereisGebruiker();
  const { evenementen } = agenda();
  const keuzes = await agendaKeuzes(g.id);
  const vandaag = vandaagIso();
  const uit = evenementen.filter((e) => e.categorie !== 'verstoring' && e.categorie !== 'demonstratie');
  const plaatsen = [...new Set(uit.map((e) => e.plaats))].sort();
  const plaats = z.plaats && (z.plaats === 'Nederland' || plaatsen.includes(z.plaats)) ? z.plaats : 'Amsterdam';
  const periode = PERIODES.find((p) => p.id === z.periode)?.id ?? 'week';
  const q = (z.q ?? '').slice(0, 100);
  const cat = z.cat as EvenementCategorie | undefined;
  const params = { plaats, periode, cat, type: z.type, gratis: z.gratis, q: q || undefined };
  const url = (extra: Record<string, string | undefined>) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...extra })) if (v) s.set(k, v);
    return `/agenda/uit?${s}`;
  };

  const inGebied = uit.filter((e) => plaats === 'Nederland' || e.plaats === plaats);
  const resultaten = inGebied
    .filter((e) => inPeriode(e, periode, vandaag))
    .filter((e) => !cat || e.categorie === cat)
    .filter((e) => !z.type || e.locatieType === z.type)
    .filter((e) => !z.gratis || e.gratis)
    .filter((e) => agendaBeoordeel(e, keuzes).zichtbaar)
    .map((e) => ({ e, score: zoekScore(e, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.e.start.localeCompare(b.e.start))
    .map((x) => x.e);
  const categorieen = [...new Set(uit.map((e) => e.categorie))] as EvenementCategorie[];
  const types = [...new Set(uit.map((e) => e.locatieType).filter((t) => t && t !== 'overig'))] as string[];
  const podia = [...new Set(inGebied.filter((e) => e.locatieType && e.locatieType !== 'buiten').map((e) => `${e.locatie}|${e.plaats}`))].sort();

  return (
    <main className="pagina">
      <Kop titel="Uitagenda" sub="Wat er te doen is in een stad of land" />
      <AgendaTabs actief="uit" />
      <form action="/agenda/uit" className="formulier">
        <div className="werkbalk">
          <PlaatsKeuze plaatsen={plaatsen} waarde={plaats} label="Stad of land" />
          <input type="hidden" name="periode" value={periode} />
          {cat && <input type="hidden" name="cat" value={cat} />}
          <span className="zoekrij">
            <input type="search" name="q" defaultValue={q} placeholder="Zoek bv. dickens, jazz, kerstmarkt" aria-label="Zoeken" />
            <button className="icoonknop" aria-label="Zoek"><Icoon naam="zoek" /></button>
          </span>
        </div>
      </form>
      <nav className="segmenten" aria-label="Periode">
        {PERIODES.map((p) => <Link key={p.id} href={url({ periode: p.id })} aria-current={p.id === periode ? 'page' : undefined}>{p.naam}</Link>)}
      </nav>
      <div className="filters-rij" role="group" aria-label="Soort">
        <Link className="chip" href={url({ cat: undefined })} aria-current={(!cat) ? 'true' : undefined}>Alles</Link>
        {categorieen.map((c) => <Link key={c} className="chip" href={url({ cat: c })} aria-current={(cat === c) ? 'true' : undefined}>{CATEGORIE_NAAM[c]}</Link>)}
      </div>
      <div className="filters-rij" role="group" aria-label="Locatie en prijs">
        {types.map((t) => <Link key={t} className="chip" href={url({ type: z.type === t ? undefined : t })} aria-current={(z.type === t) ? 'true' : undefined}>{LOCATIETYPE_NAAM[t] ?? t}</Link>)}
        <Link className="chip" href={url({ gratis: z.gratis ? undefined : '1' })} aria-current={(!!z.gratis) ? 'true' : undefined}>Gratis</Link>
      </div>

      <section className="sectie">
        <h2>{resultaten.length} {resultaten.length === 1 ? 'resultaat' : 'resultaten'}</h2>
        {resultaten.length === 0 && <p className="leeg">Niets gevonden in deze periode{q ? ` voor “${q}”` : ''}. Probeer een langere periode of heel Nederland.</p>}
        {resultaten.map((e) => <EvenementKaart key={e.id} e={e} keuzes={keuzes} toonPlaats={plaats === 'Nederland'} />)}
      </section>

      <details className="sectie blok">
        <summary><strong>Dekking:</strong> {podia.length} gevolgde locaties {plaats === 'Nederland' ? 'in Nederland' : `in ${plaats}`}</summary>
        <p className="zacht">Evenementen komen uit de eigen agenda’s van locaties en organisatoren en uit stadsagenda’s. Ontbreekt een podium, kroeg of café? Dan is de dekking daar beperkt.</p>
        <ul>{podia.map((p) => { const [l, pl] = p.split('|'); return <li key={p}>{l}{plaats === 'Nederland' ? `, ${pl}` : ''}</li>; })}</ul>
      </details>
    </main>
  );
}
