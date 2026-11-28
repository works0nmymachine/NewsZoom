import Link from 'next/link';
import { watchlistActie } from '@/app/acties';
import { Kop } from '@/components/kop';
import { inhoudMetFeeds, versheid } from '@/lib/feeds';
import { finance, koersen, REEKS_VAN, watchlistVan } from '@/lib/finance';
import { patroon } from '@/lib/herkenning';
import { procent, rendement } from '@/lib/koersmeting';
import { vereisGebruiker } from '@/lib/sessie';
import { datumKort, wanneer, wanneerKort } from '@/lib/weergave';

/** Trefwoorden om feedberichten bij een instrument te vinden (in de kop). */
const TERMEN: Record<string, string[]> = { nvda: ['Nvidia', 'Jensen Huang'], btc: ['Bitcoin', 'crypto', 'cryptomunt'], databricks: ['Databricks'] };

const geld = (n: number, valuta = 'USD') => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: valuta, maximumFractionDigits: n > 1000 ? 0 : 2 }).format(n);

export default async function FinancePagina() {
  const g = await vereisGebruiker();
  const f = finance();
  const [watch, inhoud, vers] = await Promise.all([watchlistVan(g.id), inhoudMetFeeds(), versheid()]);
  const nu = new Date();
  const feedNieuws = f.instrumenten.map((i) => {
    const r = (TERMEN[i.id] ?? [i.naam]).map(patroon);
    const items = inhoud.items.filter((x) => x.herkomst === 'feed' && r.some((p) => p.test(x.titel)))
      .sort((a, b) => b.gepubliceerd.localeCompare(a.gepubliceerd)).slice(0, 4);
    return { i, items };
  }).filter((x) => x.items.length);
  const bronNaam = (id: string) => f.bronnen.find((b) => b.id === id)?.naam ?? id;
  const kaarten = await Promise.all(f.instrumenten.map(async (i) => {
    const reeks = REEKS_VAN[i.id];
    const k = reeks ? (await koersen(reeks)).koersen : [];
    const laatste = k.at(-1);
    const week = laatste ? rendement(k, new Date(new Date(laatste.datum).getTime() - 6 * 86400000).toISOString().slice(0, 10), laatste.datum) : null;
    return { i, laatste, week };
  }));
  kaarten.sort((a, b) => Number(watch.has(b.i.id)) - Number(watch.has(a.i.id)));
  const r = f.recap;

  return (
    <main className="pagina">
      <Kop titel="Finance" sub="Koersen met het nieuws eromheen" versheid={vers} />

      {r && (
        <section className="sectie blok">
          <h2>Marktbeeld {datumKort(r.periode.van)} – {datumKort(r.periode.tot)}</h2>
          <table className="tabel">
            <thead><tr><th>Index of sector</th><th className="getal">Koersrendement</th></tr></thead>
            <tbody>
              {r.indices.map((x) => <tr key={x.naam}><td><a href={x.bron.url} rel="noopener noreferrer" target="_blank">{x.naam}</a></td><td className={`getal ${x.rendement < 0 ? 'daal' : 'stijg'}`}>{procent(x.rendement)}</td></tr>)}
              {r.sectoren?.map((x) => <tr key={x.naam}><td><a href={x.bron.url} rel="noopener noreferrer" target="_blank">{x.naam}</a> <span className="label label-zacht">Sector</span></td><td className={`getal ${x.rendement < 0 ? 'daal' : 'stijg'}`}>{procent(x.rendement)}</td></tr>)}
            </tbody>
          </table>
          <p>{r.toelichting}</p>
          {r.bijdragers && r.bijdragers.length > 0 && <>
            <h3>Wie verklaarde de beweging?</h3>
            <ul>{r.bijdragers.map((b) => <li key={b.naam}><strong>{b.naam}:</strong> {b.toelichting} <a className="zacht" href={b.bron.url} rel="noopener noreferrer" target="_blank">({bronNaam(b.bron.bron)})</a></li>)}</ul>
          </>}
          <p className="zacht">Koersrendement per index of sector. De bijdrage van afzonderlijke bedrijven aan de indexbeweging is niet berekend; de bronnen beschrijven alleen welke bedrijven de daling vooral veroorzaakten.</p>
        </section>
      )}

      <section className="sectie">
        <h2>Watchlist</h2>
        <div className="koersen">
          {kaarten.map(({ i, laatste, week }) => (
            <div key={i.id} className="koers">
              <Link href={`/finance/${i.id}`} style={{ textDecoration: 'none' }}>
                <span className="zacht">{i.ticker ?? 'Niet beursgenoteerd'}{watch.has(i.id) ? ' · ★' : ''}</span>
                <strong>{i.naam}</strong>
                {laatste
                  ? <span>{geld(laatste.slot, i.valuta)} {week != null && <span className={week < 0 ? 'daal' : 'stijg'}>{procent(week)} 7 dagen</span>}<br /><span className="zacht">slot {datumKort(laatste.datum)}</span>{nu.getTime() - new Date(laatste.datum).getTime() > 4 * 86_400_000 && <> <span className="label">verouderd</span></>}</span>
                  : <span className="zacht">Geen koersdata</span>}
              </Link>
              <form action={watchlistActie}>
                <input type="hidden" name="instrument" value={i.id} />
                <input type="hidden" name="terug" value="/finance" />
                <button className="chip" name="wat" value={watch.has(i.id) ? 'stop' : 'volg'} aria-pressed={watch.has(i.id)}>{watch.has(i.id) ? '★ In watchlist' : '☆ Volgen'}</button>
              </form>
            </div>
          ))}
        </div>
      </section>

      {feedNieuws.length > 0 && (
        <section className="sectie">
          <h2>Nieuws uit de feeds</h2>
          <p className="zacht">Recente koppen die het bedrijf of de munt noemen. Zonder koersduiding.</p>
          {feedNieuws.map(({ i, items }) => (
            <div key={i.id} className="blok" style={{ marginBottom: '0.5rem' }}>
              <h3 style={{ margin: '0 0 0.25rem' }}><Link href={`/finance/${i.id}`}>{i.naam}</Link></h3>
              <ul className="tijdlijn">
                {items.map((x) => (
                  <li key={x.id}><a href={x.url} rel="noopener noreferrer" target="_blank">{x.titel}</a> <span className="zacht">{inhoud.bronnen.get(x.bron)?.naam ?? x.bron} · {wanneerKort(x.gepubliceerd)}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      <section className="sectie">
        <h2>Duiding uit de voorbeeldset</h2>
        <ul className="tijdlijn">
          {[...f.berichten].sort((a, b) => b.gepubliceerd.localeCompare(a.gepubliceerd)).slice(0, 6).map((b) => (
            <li key={b.id}><span className="zacht">{wanneer(b.gepubliceerd)} · {f.instrumenten.find((i) => i.id === b.instrument)?.naam}</span><br />
              <Link href={`/finance/${b.instrument}?bericht=${b.id}`}>{b.titel}</Link></li>
          ))}
        </ul>
      </section>
    </main>
  );
}
