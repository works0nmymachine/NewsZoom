import Link from 'next/link';
import { BerichtKaart } from '@/components/bericht-kaart';
import { Kop, Voorbeeldlabel } from '@/components/kop';
import { VerhaalKaart } from '@/components/verhaal-kaart';
import { beoordeel, gevolgd, sorteer } from '@/lib/filters';
import type { Item } from '@/lib/inhoud';
import { paginaContext } from '@/lib/pagina';
import { datumLang } from '@/lib/weergave';

export default async function Vandaag() {
  const { regels, inhoud } = await paginaContext();
  const zichtbaar = (i: Item) => beoordeel(i, regels).zichtbaar;
  const gewicht = (i: Item) => beoordeel(i, regels).gewicht;
  const top = (r: Item['reikwijdte'], n: number) => {
    const gezien = new Set<string>();
    return sorteer(inhoud.items.filter((i) => i.reikwijdte === r && zichtbaar(i)), gewicht)
      .filter((i) => !i.verhaal || (gezien.has(i.verhaal) ? false : (gezien.add(i.verhaal), true)))
      .slice(0, n);
  };
  const volgVerhalen = [...inhoud.verhalen.values()].filter((v) =>
    gevolgd({ verhaal: v.id, onderwerpen: v.onderwerpen, bron: '' }, regels));
  return (
    <main className="pagina">
      <Kop titel="Vandaag" sub={datumLang(new Date())} />
      <Voorbeeldlabel peildatum={inhoud.peildatum} />
      <p className="zacht uitleg-selectie">
        Vandaag is een selectie: per sectie de drie belangrijkste berichten, één per verhaal.{' '}
        {regels.length === 0
          ? <>Je hebt geen filters; alles telt mee. Alle berichten staan onder <Link href="/ontdekken">Alles bekijken</Link>.</>
          : <>Je {regels.length === 1 ? 'filter telt' : `${regels.length} filters tellen`} mee. <Link href="/filters">Mijn filters</Link></>}
      </p>

      <Sectie titel="Nederland" meer="/ontdekken?r=nederland">
        {top('nederland', 3).map((i) => <BerichtKaart key={i.id} item={i} inhoud={inhoud} regels={regels} terug="/" compact />)}
      </Sectie>

      <Sectie titel="Wereld" meer="/ontdekken?r=wereld">
        {top('wereld', 3).map((i) => <BerichtKaart key={i.id} item={i} inhoud={inhoud} regels={regels} terug="/" compact />)}
      </Sectie>

      <Sectie titel="Uit je interesses" meer="/mijn-nieuws">
        {volgVerhalen.length === 0
          ? <p className="leeg">Je volgt nog niets. Kies bij een bericht <strong>Aanpassen → Meer hiervan</strong> om een verhaal of onderwerp te volgen.</p>
          : volgVerhalen.slice(0, 4).map((v) => <VerhaalKaart key={v.id} verhaal={v} inhoud={inhoud} />)}
      </Sectie>

      <Sectie titel="Lokaal: Amsterdam" meer="/ontdekken?r=lokaal">
        {top('lokaal', 3).map((i) => <BerichtKaart key={i.id} item={i} inhoud={inhoud} regels={regels} terug="/" compact />)}
      </Sectie>
    </main>
  );
}

function Sectie({ titel, meer, children }: { titel: string; meer: string; children: React.ReactNode }) {
  return (
    <section className="sectie">
      <div className="sectie-kop">
        <h2>{titel}</h2>
        <Link href={meer}>Alles bekijken →</Link>
      </div>
      {children}
    </section>
  );
}
