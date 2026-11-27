import Link from 'next/link';
import { interesseOpslaan, interesseWijzig } from '@/app/acties';
import { BerichtKaart } from '@/components/bericht-kaart';
import { Kop } from '@/components/kop';
import { VerhaalKaart } from '@/components/verhaal-kaart';
import { pool } from '@/lib/db';
import { beoordeel, gevolgd } from '@/lib/filters';
import type { Item } from '@/lib/inhoud';
import { past, termen, type Interesse } from '@/lib/interesses';
import { interessesVan } from '@/lib/interesses-db';
import { paginaContext } from '@/lib/pagina';

type Zoek = Promise<{ naam?: string; zoektermen?: string; uitsluitingen?: string; interesse?: string }>;

const tekst = (i: Item) => `${i.titel} ${i.samenvatting} ${i.nieuw ?? ''}`;
const nieuwsteEerst = (a: Item, b: Item) => b.gepubliceerd.localeCompare(a.gepubliceerd);

export default async function MijnNieuws({ searchParams }: { searchParams: Zoek }) {
  const z = await searchParams;
  const { gebruiker, regels, inhoud } = await paginaContext();
  const interesses = await interessesVan(gebruiker.id);
  const lees = await pool().query(`SELECT verhaal, gelezen_at FROM nz_leesmomenten WHERE gebruiker = $1`, [gebruiker.id]);
  const gelezen = new Map<string, Date>(lees.rows.map((r) => [r.verhaal, r.gelezen_at]));

  const verhalen = [...inhoud.verhalen.values()].filter((v) => gevolgd({ verhaal: v.id, onderwerpen: v.onderwerpen, bron: '' }, regels));
  const volgOnderwerpen = regels.filter((r) => r.doelSoort === 'onderwerp' && r.actie === 'meer');
  const volgVerhaalIds = new Set(verhalen.map((v) => v.id));
  const losseBerichten = inhoud.items
    .filter((i) => (!i.verhaal || !volgVerhaalIds.has(i.verhaal)) && gevolgd(i, regels))
    .sort(nieuwsteEerst).slice(0, 10);

  const bewerk = z.interesse ? interesses.find((i) => i.id === Number(z.interesse)) : undefined;
  const concept = z.naam ? {
    naam: z.naam.trim().slice(0, 100), zoektermen: termen(z.zoektermen ?? ''), uitsluitingen: termen(z.uitsluitingen ?? ''),
  } : null;

  return (
    <main className="pagina">
      <Kop titel="Mijn Nieuws" sub="Verhalen, onderwerpen en interesses die je volgt" />

      <section className="sectie">
        <h2>Gevolgde verhalen</h2>
        {verhalen.length === 0 && <p className="leeg">Je volgt nog geen verhaal. Open een verhaal en kies <strong>Volg dit verhaal</strong>, of kies bij een bericht <strong>Aanpassen → Meer hiervan</strong>.</p>}
        {verhalen.map((v) => {
          const vorig = gelezen.get(v.id);
          const sinds = vorig ? inhoud.items.filter((i) => i.verhaal === v.id && new Date(i.gepubliceerd) > vorig).length : 0;
          return <VerhaalKaart key={v.id} verhaal={v} inhoud={inhoud} sinds={sinds} />;
        })}
      </section>

      {(volgOnderwerpen.length > 0 || losseBerichten.length > 0) && (
        <section className="sectie">
          <h2>Uit gevolgde onderwerpen en bronnen</h2>
          {volgOnderwerpen.length > 0 && <p className="zacht">Je volgt: {volgOnderwerpen.map((r) => inhoud.onderwerpen.get(r.doelId)?.naam ?? r.doelId).join(', ')}.</p>}
          {losseBerichten.map((i) => <BerichtKaart key={i.id} item={i} inhoud={inhoud} regels={regels} terug="/mijn-nieuws" />)}
        </section>
      )}

      <section className="sectie">
        <h2>Eigen interesses</h2>
        {interesses.length === 0 && <p className="leeg">Nog geen eigen interesses. Voeg hieronder bijvoorbeeld een bedrijf, organisatie of onderwerp toe.</p>}
        {interesses.map((it) => <InteresseBlok key={it.id} it={it} items={inhoud.items} inhoud={inhoud} regels={regels} />)}
      </section>

      <section className="sectie blok" id="interesse">
        <h2>{bewerk ? `Interesse aanpassen: ${bewerk.naam}` : 'Interesse toevoegen of Ik mis iets'}</h2>
        <p className="zacht">Typ wat je wilt volgen. Met zoektermen en uitsluitingen baken je de interesse af. Je ziet eerst een voorproef; pas bij Opslaan verandert je voorkeur.</p>
        <form action="/mijn-nieuws#interesse" className="formulier">
          {bewerk && <input type="hidden" name="interesse" value={bewerk.id} />}
          <label>Naam<input name="naam" required maxLength={100} defaultValue={concept?.naam ?? bewerk?.naam ?? ''} placeholder="Bijvoorbeeld Databricks of AI-modellen" /></label>
          <label>Zoektermen (met komma&apos;s)<input name="zoektermen" defaultValue={concept ? concept.zoektermen.join(', ') : bewerk?.zoektermen.join(', ') ?? ''} placeholder="Leeg = de naam" /></label>
          <label>Uitsluitingen (met komma&apos;s)<input name="uitsluitingen" defaultValue={concept ? concept.uitsluitingen.join(', ') : bewerk?.uitsluitingen.join(', ') ?? ''} placeholder="Bijvoorbeeld beurskoers" /></label>
          <button className="knop">Voorproef bekijken</button>
        </form>
        {concept && <Voorproef concept={concept} items={inhoud.items} interesseId={z.interesse} />}
      </section>
    </main>
  );
}

function InteresseBlok({ it, items, inhoud, regels }: { it: Interesse; items: Item[]; inhoud: Awaited<ReturnType<typeof paginaContext>>['inhoud']; regels: Awaited<ReturnType<typeof paginaContext>>['regels'] }) {
  const treffers = it.gedempt ? [] : items.filter((i) => past(tekst(i), it) && beoordeel(i, regels).zichtbaar).sort(nieuwsteEerst).slice(0, 5);
  return (
    <div className="interesse">
      <div className="sectie-kop">
        <h3>{it.naam}{it.gedempt && <span className="label label-zacht">Gedempt</span>}</h3>
        <form action={interesseWijzig} className="knoppenrij">
          <input type="hidden" name="interesse" value={it.id} />
          <input type="hidden" name="terug" value="/mijn-nieuws" />
          <Link className="chip" href={`/mijn-nieuws?interesse=${it.id}#interesse`}>Te breed / aanpassen</Link>
          <button className="chip" name="wat" value={it.gedempt ? 'activeer' : 'demp'}>{it.gedempt ? 'Activeren' : 'Dempen'}</button>
          <button className="chip chip-zacht" name="wat" value="verwijder">Verwijderen</button>
        </form>
      </div>
      <p className="zacht">Zoekt op: {(it.zoektermen.length ? it.zoektermen : [it.naam]).join(', ')}{it.uitsluitingen.length ? `; niet: ${it.uitsluitingen.join(', ')}` : ''}</p>
      {!it.gedempt && treffers.length === 0 && <p className="leeg">Nog geen nieuws gevonden. De interesse blijft bewaard; nieuwe berichten uit de gevolgde bronnen verschijnen hier vanzelf.</p>}
      {treffers.map((i) => <BerichtKaart key={i.id} item={i} inhoud={inhoud} regels={regels} terug="/mijn-nieuws" />)}
    </div>
  );
}

function Voorproef({ concept, items, interesseId }: { concept: { naam: string; zoektermen: string[]; uitsluitingen: string[] }; items: Item[]; interesseId?: string }) {
  const binnen = items.filter((i) => past(tekst(i), concept)).sort(nieuwsteEerst);
  const buiten = concept.uitsluitingen.length
    ? items.filter((i) => past(tekst(i), { ...concept, uitsluitingen: [] }) && !past(tekst(i), concept))
    : [];
  return (
    <div className="voorproef">
      <h3>Voorproef</h3>
      <p>{binnen.length} {binnen.length === 1 ? 'bericht valt' : 'berichten vallen'} binnen deze afbakening{buiten.length ? `, ${buiten.length} vallen erbuiten door je uitsluitingen` : ''}.</p>
      <ul className="tijdlijn">
        {binnen.slice(0, 5).map((i) => <li key={i.id}>✓ {i.titel}</li>)}
        {buiten.slice(0, 3).map((i) => <li key={i.id} className="zacht">✗ {i.titel}</li>)}
      </ul>
      {binnen.length === 0 && <p className="zacht">Nu nog niets gevonden. Je kunt de interesse toch opslaan; NewsZoom toont nieuwe berichten zodra ze binnenkomen.</p>}
      <form action={interesseOpslaan}>
        {interesseId && <input type="hidden" name="interesse" value={interesseId} />}
        <input type="hidden" name="naam" value={concept.naam} />
        <input type="hidden" name="zoektermen" value={concept.zoektermen.join(', ')} />
        <input type="hidden" name="uitsluitingen" value={concept.uitsluitingen.join(', ')} />
        <button className="knop knop-hoofd">Opslaan</button>
      </form>
    </div>
  );
}
