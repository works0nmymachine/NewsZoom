import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Kop } from '@/components/kop';
import { BENCHMARK_REEKS, finance, koersen, REEKS_VAN } from '@/lib/finance';
import type { FinanceBericht } from '@/lib/finance-agenda-types';
import { meet, procent, VENSTER_NAAM, zoneTijd, type Koers, type Meting, type Venster } from '@/lib/koersmeting';
import { vereisGebruiker } from '@/lib/sessie';
import { datumKort, wanneer } from '@/lib/weergave';

type Params = Promise<{ id: string }>;
type Zoek = Promise<{ bericht?: string; venster?: string; periode?: string }>;

const tijdFmt = (iso: string, tz: string) => new Intl.DateTimeFormat('nl-NL', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(new Date(iso));

/** Was het bericht voor, tijdens of na de beursuren (New York, 9:30–16:00)? */
function beursmoment(iso: string, tz: string): string {
  const d = new Date(iso);
  const datum = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
  const dag = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(d);
  if (dag === 'Sat' || dag === 'Sun') return 'in het weekend, buiten beursuren';
  if (d < zoneTijd(datum, '09:30', tz)) return 'vóór de opening';
  if (d < zoneTijd(datum, '16:00', tz)) return 'tijdens beursuren';
  return 'na beurssluiting';
}

export default async function InstrumentPagina({ params, searchParams }: { params: Params; searchParams: Zoek }) {
  const [{ id }, z] = await Promise.all([params, searchParams]);
  await vereisGebruiker();
  const f = finance();
  const inst = f.instrumenten.find((i) => i.id === id);
  if (!inst) notFound();
  const crypto = inst.soort === 'crypto';
  const vensters: Venster[] = crypto ? ['24u', '7d'] : ['1d', '5d'];
  const venster = vensters.find((v) => v === z.venster) ?? vensters[0];
  const reeks = REEKS_VAN[inst.id];
  const data = reeks ? await koersen(reeks) : null;
  const bench = BENCHMARK_REEKS[inst.id] ? await koersen(BENCHMARK_REEKS[inst.id].reeks) : null;
  const tz = inst.tijdzone ?? 'UTC';
  const berichten = f.berichten.filter((b) => b.instrument === id).sort((a, b) => a.gepubliceerd.localeCompare(b.gepubliceerd));
  const gekozen = berichten.find((b) => b.id === z.bericht);
  const metingen = new Map<string, Meting>(berichten.map((b) => [b.id, data && data.koersen.length ? meet(data.koersen, b.gepubliceerd, venster, { soort: crypto ? 'crypto' : 'aandeel', tijdzone: tz }) : { beschikbaar: false, reden: 'Geen koersdata.', venster }]));
  const dagen = z.periode === '180' ? 180 : z.periode === '30' ? 30 : 90;
  const link = (extra: Record<string, string | undefined>) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries({ bericht: gekozen?.id, venster, periode: String(dagen), ...extra })) if (v) s.set(k, v);
    return `/finance/${id}?${s}`;
  };
  const bronNaam = (bid: string) => f.bronnen.find((b) => b.id === bid)?.naam ?? bid;
  const gm = gekozen ? metingen.get(gekozen.id) : undefined;
  const benchMeting = gekozen && bench?.koersen.length ? meet(bench.koersen, gekozen.gepubliceerd, venster, { soort: 'aandeel', tijdzone: tz }) : undefined;

  return (
    <main className="pagina">
      <Kop titel={inst.naam} sub={[inst.ticker, inst.beurs, inst.valuta].filter(Boolean).join(' · ') || 'Bedrijf zonder beursnotering'} />
      <p><Link href="/finance">← Finance</Link></p>

      {data && data.koersen.length > 0 ? (
        <section className="sectie">
          <div className="werkbalk">
            <div className="schakel" role="group" aria-label="Periode">
              {['30', '90', '180'].map((p) => <Link key={p} href={link({ periode: p })} aria-current={String(dagen) === p ? 'page' : undefined}>{p} dagen</Link>)}
            </div>
            <div className="schakel" role="group" aria-label="Meetvenster">
              {vensters.map((v) => <Link key={v} href={link({ venster: v })} aria-current={v === venster ? 'page' : undefined}>{v === '1d' ? '1 handelsdag' : v === '5d' ? '5 handelsdagen' : v === '24u' ? '24 uur' : '7 dagen'}</Link>)}
            </div>
          </div>
          <Grafiek koersen={data.koersen.slice(-Math.round(dagen * (crypto ? 1 : 0.69)))} berichten={berichten} metingen={metingen} gekozen={gekozen?.id} link={(b) => link({ bericht: b })} tz={tz} crypto={crypto} />
          <p className="zacht">Dagelijkse slotkoersen ({crypto ? 'om 00:00 UTC' : `16:00 ${tz === 'America/New_York' ? 'New Yorkse tijd' : tz}`}), bron: {data.bron}{data.bijgewerkt ? `, bijgewerkt ${wanneer(data.bijgewerkt)}` : ''}. Gemarkeerde punten zijn nieuwsberichten.</p>
        </section>
      ) : (
        <section className="sectie leeg">
          <p><strong>Geen koersgrafiek.</strong> {inst.naam} heeft geen beursnotering. Een gemelde waardering is geen koerspunt. Grafiek en koerswijziging komen zodra er betrouwbare koersdata zijn.</p>
        </section>
      )}

      {gekozen && (
        <section className="sectie blok" id="bericht">
          <p className="zacht">{tijdFmt(gekozen.gepubliceerd, tz)}{!crypto && ` · ${beursmoment(gekozen.gepubliceerd, tz)}`}</p>
          <h2><a href={gekozen.url} rel="noopener noreferrer" target="_blank">{gekozen.titel} ↗</a></h2>
          <p className="zacht">{bronNaam(gekozen.bron)}</p>
          {gm && <MetingRegel m={gm} />}
          {gm?.beschikbaar && benchMeting?.beschikbaar && (
            <p className="zacht">Ter vergelijking: {BENCHMARK_REEKS[inst.id].naam} {procent(benchMeting.procent)} in hetzelfde venster.</p>
          )}
          <h3>Wat wist de markt al?</h3>
          <dl className="wist">
            <dt>Eerder bekend</dt>
            <dd>{gekozen.eerderBekend ? <>{gekozen.eerderBekend.tekst}{gekozen.eerderBekend.link && <> <a href={gekozen.eerderBekend.link.url} rel="noopener noreferrer" target="_blank">({bronNaam(gekozen.eerderBekend.link.bron)}, {datumKort(gekozen.eerderBekend.link.datum)})</a></>}</> : 'Geen eerdere publicatie gevonden.'}</dd>
            <dt>Nieuw in dit bericht</dt><dd>{gekozen.nieuw}</dd>
            <dt>Mogelijke invloed</dt><dd>{gekozen.mogelijkeInvloed}</dd>
            <dt>Onzekerheid</dt><dd>{gekozen.onzekerheid}</dd>
          </dl>
          <p className="zacht">Het percentage beschrijft de gemeten beweging na publicatie, niet de oorzaak. Bredere marktbewegingen kunnen meespelen.</p>
        </section>
      )}

      <section className="sectie">
        <h2>Nieuwstijdlijn</h2>
        {berichten.length === 0 && <p className="leeg">Nog geen berichten.</p>}
        {[...berichten].reverse().map((b) => {
          const m = metingen.get(b.id)!;
          return (
            <article key={b.id} className={`kaart${b.id === gekozen?.id ? ' geopend' : ''}`}>
              <p className="kaart-meta"><span>{tijdFmt(b.gepubliceerd, tz)}</span>{!crypto && <span>{beursmoment(b.gepubliceerd, tz)}</span>}<span>{bronNaam(b.bron)}</span></p>
              <h3 className="kaart-titel"><Link href={link({ bericht: b.id })}>{b.titel}</Link></h3>
              <MetingRegel m={m} />
              <p className="nieuw"><strong>Nieuw:</strong> {b.nieuw}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}

function MetingRegel({ m }: { m: Meting }) {
  if (!m.beschikbaar) return <p className="zacht">{m.reden}</p>;
  return (
    <p>
      <strong className={m.procent < 0 ? 'daal' : 'stijg'}>{procent(m.procent)} {VENSTER_NAAM[m.venster]}</strong>
      <span className="zacht"> · van {m.referentie.slot.toLocaleString('nl-NL')} ({datumKort(m.referentie.datum)}) naar {m.eind.slot.toLocaleString('nl-NL')} ({datumKort(m.eind.datum)}){m.benadering ? '; benadering op basis van dagkoersen' : ''}</span>
    </p>
  );
}

function Grafiek({ koersen, berichten, metingen, gekozen, link, tz, crypto }: {
  koersen: Koers[]; berichten: FinanceBericht[]; metingen: Map<string, Meting>; gekozen?: string;
  link: (b: string) => string; tz: string; crypto: boolean;
}) {
  const B = 640, H = 260, L = 8, R = 56, T = 12, O = 26;
  const min = Math.min(...koersen.map((k) => k.slot)), max = Math.max(...koersen.map((k) => k.slot));
  const span = max - min || 1;
  const t0 = new Date(koersen[0].datum).getTime(), t1 = new Date(koersen.at(-1)!.datum).getTime() || t0 + 1;
  const x = (iso: string) => L + ((new Date(iso).getTime() - t0) / (t1 - t0 || 1)) * (B - L - R);
  const y = (v: number) => T + (1 - (v - min) / span) * (H - T - O);
  const pad = koersen.map((k, n) => `${n ? 'L' : 'M'}${x(k.datum).toFixed(1)},${y(k.slot).toFixed(1)}`).join(' ');
  const slotOp = (iso: string) => {
    const d = new Intl.DateTimeFormat('en-CA', { timeZone: crypto ? 'UTC' : tz }).format(new Date(iso));
    return koersen.filter((k) => k.datum <= d).at(-1) ?? koersen[0];
  };
  const zichtbaar = berichten.filter((b) => new Date(b.gepubliceerd).getTime() >= t0);
  const g = gekozen ? metingen.get(gekozen) : undefined;
  const labels = [0, 0.5, 1].map((f) => min + f * span);
  return (
    <svg className="grafiek" viewBox={`0 0 ${B} ${H}`} role="img" aria-label="Koersgrafiek met nieuwsmarkeringen">
      {g?.beschikbaar && <rect className="venster" x={x(g.referentie.datum)} y={T} width={Math.max(2, x(g.eind.datum) - x(g.referentie.datum))} height={H - T - O} />}
      {labels.map((v) => <g key={v}><line className="as" x1={L} x2={B - R} y1={y(v)} y2={y(v)} /><text className="astekst" x={B - R + 4} y={y(v) + 4}>{v.toLocaleString('nl-NL', { maximumFractionDigits: v > 1000 ? 0 : 2 })}</text></g>)}
      <text className="astekst" x={L} y={H - 8}>{datumKort(koersen[0].datum)}</text>
      <text className="astekst" x={B - R} y={H - 8} textAnchor="end">{datumKort(koersen.at(-1)!.datum)}</text>
      <path className="lijn-koers" d={pad} />
      {zichtbaar.map((b) => {
        const k = slotOp(b.gepubliceerd);
        const m = metingen.get(b.id);
        return (
          <a key={b.id} href={link(b.id) + '#bericht'}>
            <title>{`${b.titel}${m?.beschikbaar ? ` (${procent(m.procent)})` : ''}`}</title>
            <circle className={b.id === gekozen ? 'markering-actief' : 'markering'} cx={x(b.gepubliceerd)} cy={y(k.slot)} r={b.id === gekozen ? 8 : 6} />
          </a>
        );
      })}
    </svg>
  );
}
