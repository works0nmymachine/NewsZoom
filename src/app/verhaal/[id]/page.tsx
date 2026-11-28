import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AutoAchtergrondStatus } from '@/components/auto-achtergrond';
import { BerichtKaart } from '@/components/bericht-kaart';
import { Kop } from '@/components/kop';
import { VolgKnoppen } from '@/components/volg-knoppen';
import { aiBeschikbaar, alsDossier, autoAchtergrond } from '@/lib/achtergrond';
import { pool } from '@/lib/db';
import type { Laag, Link as BronLink } from '@/lib/inhoud-types';
import { paginaContext } from '@/lib/pagina';
import { kaarten, perDag } from '@/lib/selectie';
import { alineas, datumKort, wanneer } from '@/lib/weergave';

type Params = Promise<{ id: string }>;
type Zoek = Promise<{ laag?: string; bericht?: string; alle?: string }>;

const LAGEN = [
  { id: 'sinds', naam: 'Sinds je laatste bezoek' },
  { id: 'kort', naam: 'Kort' },
  { id: 'week', naam: 'Deze week' },
  { id: 'maanden', naam: 'Afgelopen maanden' },
  { id: 'begin', naam: 'Vanaf het begin' },
] as const;

export default async function VerhaalPagina({ params, searchParams }: { params: Params; searchParams: Zoek }) {
  const [{ id }, z] = await Promise.all([params, searchParams]);
  const { gebruiker, regels, inhoud } = await paginaContext();
  const verhaal = inhoud.verhalen.get(id);
  if (!verhaal) notFound();

  const berichten = inhoud.items.filter((i) => i.verhaal === id).sort((a, b) => b.gepubliceerd.localeCompare(a.gepubliceerd));
  const geopend = z.bericht ? berichten.find((b) => b.id === z.bericht) : undefined;

  const vorige = await pool().query(`SELECT gelezen_at FROM nz_leesmomenten WHERE gebruiker = $1 AND verhaal = $2`, [gebruiker.id, id]);
  const vorigBezoek: Date | null = vorige.rows[0]?.gelezen_at ?? null;
  await pool().query(
    `INSERT INTO nz_leesmomenten (gebruiker, verhaal) VALUES ($1, $2) ON CONFLICT (gebruiker, verhaal) DO UPDATE SET gelezen_at = now()`,
    [gebruiker.id, id],
  );
  const sindsdien = vorigBezoek ? berichten.filter((b) => new Date(b.gepubliceerd) > vorigBezoek) : [];
  // Zonder handmatig dossier: de automatisch samengestelde achtergrond, als die er is.
  const auto = verhaal.dossier ? null : await autoAchtergrond(`verhaal:${id}`);
  const autoKlaar = auto?.status === 'klaar' && auto.inhoud ? auto.inhoud : null;

  const beschikbaar = LAGEN.filter((l) => (l.id === 'sinds' ? !!vorigBezoek : l.id === 'kort' || !!verhaal.dossier || !!autoKlaar));
  const standaard = 'kort';
  const laag = beschikbaar.find((l) => l.id === z.laag)?.id ?? standaard;
  const d = verhaal.dossier ?? (autoKlaar ? alsDossier(autoKlaar) : undefined);
  const watVerandert = verhaal.watVerandert ?? (autoKlaar?.watVerandert?.tekst ? { ...autoKlaar.watVerandert, bronnen: [] } : undefined);
  const partijen = verhaal.partijen?.length ? verhaal.partijen : autoKlaar?.partijen;
  const inhoudLaag: Laag | null =
    laag === 'kort' ? (d?.kort ?? null)
    : laag === 'week' ? (d?.dezeWeek ?? null)
    : laag === 'maanden' ? (d?.afgelopenMaanden ?? null)
    : laag === 'begin' ? (d?.vanafBegin ?? null) : null;

  const regel = regels.find((r) => r.doelSoort === 'verhaal' && r.doelId === id);
  const basis = `/verhaal/${id}${z.bericht ? `?bericht=${encodeURIComponent(z.bericht)}&` : '?'}`;
  const dossierDatum = berichten.find((b) => b.herkomst === 'voorbeeldset')?.gepubliceerd;
  const nu = new Date();
  const verhaalKaarten = kaarten(berichten, regels, nu, { breed: true }).sort((a, b) => b.nieuwst.localeCompare(a.nieuwst));
  const getoond = z.alle ? verhaalKaarten : verhaalKaarten.slice(0, 15);
  const nieuwereFeed = berichten.filter((b) => b.herkomst === 'feed' && (!dossierDatum || b.gepubliceerd > dossierDatum));
  const actueel = geopend ?? berichten[0];
  const bronNaam = (l: BronLink) => inhoud.bronnen.get(l.bron)?.naam ?? l.bron;

  return (
    <main className="pagina">
      <Kop titel={verhaal.titel} sub={verhaal.onderwerpen.map((o) => inhoud.onderwerpen.get(o)?.naam ?? o).join(' · ')} terug="/" />
      <VolgKnoppen id={id} naam={verhaal.titel} huidig={regel?.actie ?? null} />

      {actueel && (
        <section className="geopend">
          <h2>{actueel.titel}</h2>
          <p className="kaart-meta"><span>{inhoud.bronnen.get(actueel.bron)?.naam}</span><span>{wanneer(actueel.gepubliceerd)}</span></p>
          <p>{actueel.samenvatting || actueel.nieuw || 'Nog geen samenvatting beschikbaar.'}</p>
          <a href={actueel.url} rel="noopener noreferrer" target="_blank">Lees origineel ↗</a>
        </section>
      )}

      <section className="sectie" id="achtergrond">
        <h2>Achtergrond</h2>
        {!verhaal.dossier && <AutoAchtergrondStatus a={auto} soort="verhaal" id={id} terug={`${basis}laag=kort#achtergrond`} beschikbaar={aiBeschikbaar()} />}
        <nav className="segmenten segmenten-klein" aria-label="Kies diepgang">
          {beschikbaar.map((l) => <Link key={l.id} href={`${basis}laag=${l.id}#achtergrond`} aria-current={l.id === laag ? 'page' : undefined}>{l.naam}</Link>)}
        </nav>
        {laag === 'sinds' && vorigBezoek && (
          sindsdien.length === 0
            ? <p className="leeg">Niets nieuws sinds je laatste bezoek op {datumKort(vorigBezoek.toISOString())}.</p>
            : <div>
                <p>Sinds je laatste bezoek op {datumKort(vorigBezoek.toISOString())}: {sindsdien.length} {sindsdien.length === 1 ? 'nieuw bericht' : 'nieuwe berichten'}.</p>
                <ul className="tijdlijn">{sindsdien.map((b) => <li key={b.id}><span className="zacht">{wanneer(b.gepubliceerd)}</span> {b.nieuw ?? b.titel}</li>)}</ul>
              </div>
        )}
        {inhoudLaag && <>
          {alineas(inhoudLaag.tekst).map((a, n) => <p key={n}>{a}</p>)}
          <Bronnen links={inhoudLaag.bronnen} naam={bronNaam} />
        </>}
        {laag === 'kort' && !d && (
          <div className="leeg">
            <p>Er is nog geen uitgebreid dossier voor dit verhaal.</p>
            <p><strong>Wel beschikbaar:</strong> de laatste ontwikkeling{verhaal.watVerandert ? ', wat het verandert' : ''} en {berichten.length} {berichten.length === 1 ? 'bericht' : 'berichten'}.</p>
            <p><strong>Ontbreekt nog:</strong> een overzicht van deze week, de afgelopen maanden en het begin. Laat hem hierboven samenstellen.</p>
          </div>
        )}
      </section>

      {actueel && (
        <details className="blok sectie">
          <summary><strong>Wat verandert dit?</strong></summary>
          {actueel.nieuw && actueel.nieuw !== actueel.samenvatting && <p>{actueel.nieuw}</p>}
          <p className="zacht">Een specifieke analyse van dit bericht ten opzichte van het hele dossier is nog niet beschikbaar.</p>
          {watVerandert && <details>
            <summary>Eerdere analyse van het dossier</summary>
            {alineas(watVerandert.tekst).map((a, n) => <p key={n}>{a}</p>)}
            {watVerandert.onzeker && <p><strong>Nog onzeker:</strong> {watVerandert.onzeker}</p>}
            <Bronnen links={watVerandert.bronnen} naam={bronNaam} />
          </details>}
        </details>
      )}

      {nieuwereFeed.length > 0 && (
        <details className="blok sectie">
          <summary><strong>Nieuwste berichten ({nieuwereFeed.length})</strong></summary>
          <ul className="tijdlijn">
            {nieuwereFeed.slice(0, 6).map((b) => (
              <li key={b.id}><span className="zacht">{wanneer(b.gepubliceerd)} · {inhoud.bronnen.get(b.bron)?.naam ?? b.bron}</span><br />
                <Link href={`/verhaal/${id}?bericht=${encodeURIComponent(b.id)}`}>{b.titel}</Link></li>
            ))}
          </ul>
        </details>
      )}

      {partijen && partijen.length > 0 && (
        <section className="sectie">
          <h2>Betrokken partijen</h2>
          <dl className="partijen">{partijen.map((p) => <div key={p.naam}><dt>{p.naam}</dt><dd>{p.belang}</dd></div>)}</dl>
        </section>
      )}

      {verhaal.correcties && verhaal.correcties.length > 0 && (
        <section className="sectie blok blok-correctie">
          <h2>Aanpassingen in dit dossier</h2>
          {verhaal.correcties.map((c, n) => (
            <div key={n} className="correctie">
              <p><strong>{datumKort(c.datum)}</strong>{c.voorbeeld && <span className="label">Voorbeeld</span>}</p>
              <p><span className="zacht">Eerder:</span> {c.was}</p>
              <p><span className="zacht">Nu:</span> {c.wordt}</p>
              <p className="zacht">Op basis van <a href={c.bron.url} rel="noopener noreferrer" target="_blank">{bronNaam(c.bron)}: {c.bron.titel}</a></p>
            </div>
          ))}
        </section>
      )}

      <details className="sectie blok" id="alle" open={!!z.alle}>
        <summary><strong>Alle berichten in dit verhaal ({berichten.length})</strong></summary>
        {perDag(getoond, nu).map((d) => (
          <div key={d.dag}>
            <h3 className="dag-kop">{d.naam}</h3>
            {d.kaarten.map((k) => <BerichtKaart key={k.item.id} item={k.item} ook={k.ook} b={k.b} inhoud={inhoud} regels={regels} toonVerhaal={false} nieuwSinds={vorigBezoek} />)}
          </div>
        ))}
        {verhaalKaarten.length > getoond.length && <p><Link className="knop" scroll={false} href={`${basis}alle=1`}>Meer tonen ({verhaalKaarten.length - getoond.length})</Link></p>}
      </details>
    </main>
  );
}

function Bronnen({ links, naam }: { links: BronLink[]; naam: (l: BronLink) => string }) {
  if (!links.length) return null;
  return (
    <details className="bronnen">
      <summary>Bronnen ({links.length})</summary>
      <ul>{links.map((l) => <li key={l.url}><a href={l.url} rel="noopener noreferrer" target="_blank">{naam(l)}: {l.titel}</a> <span className="zacht">{datumKort(l.datum)}</span></li>)}</ul>
    </details>
  );
}
