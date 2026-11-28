import Link from 'next/link';
import { BerichtKaart } from '@/components/bericht-kaart';
import { Kop } from '@/components/kop';
import { VerhaalKaart } from '@/components/verhaal-kaart';
import { versheid } from '@/lib/feeds';
import { gevolgd } from '@/lib/filters';
import { noemtGebied } from '@/lib/gebieden';
import type { Item } from '@/lib/inhoud';
import { bezoek, instellingenVan } from '@/lib/instellingen';
import { paginaContext } from '@/lib/pagina';
import { kaarten, reden, recent, top, type Kaart } from '@/lib/selectie';
import { datumLang, tijd } from '@/lib/weergave';

const UREN = 36; // Vandaag toont het nieuws van de afgelopen anderhalve dag; is dat te weinig, dan het nieuwste

export default async function Vandaag() {
  const { gebruiker, regels, inhoud } = await paginaContext();
  const [vers, instellingen, vorigBezoek] = await Promise.all([versheid(), instellingenVan(gebruiker.id), bezoek(gebruiker.id)]);
  const nu = new Date();
  // Elk bericht staat maar in één sectie: wat eerder op de pagina staat, valt later weg.
  const getoond = new Set<string>();
  const sectie = (filter: (i: Item) => boolean, n: number) => {
    const k = top(kaarten(recent(inhoud.items.filter((i) => filter(i) && !getoond.has(i.id)), nu, UREN, n * 2), regels, nu), n);
    for (const x of k) for (const i of [x.item, ...x.ook]) getoond.add(i.id);
    return k;
  };

  const nederland = sectie((i) => i.reikwijdte === 'nederland', 4);
  const wereld = sectie((i) => i.reikwijdte === 'wereld', 4);
  const volgVerhalen = [...inhoud.verhalen.values()].filter((v) => gevolgd({ verhaal: v.id, onderwerpen: v.onderwerpen, bron: '' }, regels));
  const volgtOnderwerp = regels.some((r) => r.actie === 'meer' && r.doelSoort !== 'verhaal');
  const uitInteresses = volgtOnderwerp ? sectie((i) => gevolgd(i, regels) && !volgVerhalen.some((v) => v.id === i.verhaal), 3) : [];
  const gebied = instellingen.gebied;
  const lokaal = gebied ? sectie((i) => i.reikwijdte === 'lokaal' && i.gebied === (gebied.ouder ?? gebied.id) && noemtGebied(`${i.titel} ${i.samenvatting}`, gebied), 3) : [];
  const nieuw = vorigBezoek ? inhoud.items.filter((i) => new Date(i.gepubliceerd) > vorigBezoek).length : 0;

  const lijst = (k: Kaart[]) => k.map((x) => (
    <BerichtKaart key={x.item.id} item={x.item} ook={x.ook} b={x.b} reden={reden(x, inhoud)} inhoud={inhoud} regels={regels} nieuwSinds={vorigBezoek} compact />
  ));

  return (
    <main className="pagina">
      <Kop titel="Vandaag" sub={datumLang(nu)} versheid={vers} />
      {!instellingen.startKlaar && regels.length === 0 && (
        <div className="melding start-melding">
          <strong>Stel je nieuws in.</strong> Kies onderwerpen en je gebied; duurt een minuut. <Link href="/start">Instellen</Link>
        </div>
      )}
      {vorigBezoek && nieuw > 0 && (
        <p className="zacht nieuw-regel"><span className="label label-nieuw">Nieuw</span> {nieuw} {nieuw === 1 ? 'bericht' : 'berichten'} sinds je vorige bezoek om {tijd(vorigBezoek)}</p>
      )}

      <Sectie titel="Nederland" meer="/ontdekken?r=nederland">{lijst(nederland)}</Sectie>
      <Sectie titel="Wereld" meer="/ontdekken?r=wereld">{lijst(wereld)}</Sectie>

      <Sectie titel="Uit je interesses" meer="/mijn-nieuws">
        {volgVerhalen.length === 0 && uitInteresses.length === 0
          ? <p className="leeg">Je volgt nog niets. Kies bij een bericht ⋯ → <strong>Meer</strong>, of <Link href="/start">kies onderwerpen</Link>.</p>
          : <>
              {volgVerhalen.slice(0, 3).map((v) => <VerhaalKaart key={v.id} verhaal={v} inhoud={inhoud} />)}
              {lijst(uitInteresses)}
            </>}
      </Sectie>

      {gebied && (
        <Sectie titel={`Lokaal: ${gebied.naam}`} meer={`/ontdekken?r=lokaal&gebied=${gebied.id}`}>
          {lokaal.length ? lijst(lokaal) : <p className="leeg">Geen recente berichten over {gebied.naam}. <Link href={`/ontdekken?r=lokaal&gebied=${gebied.id}#bronnen`}>Bronnen in dit gebied</Link></p>}
        </Sectie>
      )}
    </main>
  );
}

function Sectie({ titel, meer, children }: { titel: string; meer: string; children: React.ReactNode }) {
  return (
    <section className="sectie">
      <div className="sectie-kop">
        <h2>{titel}</h2>
        <Link href={meer}>Alles</Link>
      </div>
      {children}
    </section>
  );
}
