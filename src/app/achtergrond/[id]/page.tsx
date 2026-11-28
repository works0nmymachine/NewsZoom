import { notFound } from 'next/navigation';
import { AutoAchtergrondStatus } from '@/components/auto-achtergrond';
import { Kop } from '@/components/kop';
import { aiBeschikbaar, autoAchtergrond } from '@/lib/achtergrond';
import { itemOpId } from '@/lib/feeds';
import { vereisGebruiker } from '@/lib/sessie';
import { alineas, datumKort, wanneer } from '@/lib/weergave';

type Params = Promise<{ id: string }>;

const LAGEN = [
  { id: 'kort', naam: 'Kort' },
  { id: 'dezeWeek', naam: 'Deze week' },
  { id: 'afgelopenMaanden', naam: 'Afgelopen maanden' },
  { id: 'vanafBegin', naam: 'Vanaf het begin' },
] as const;

/** Achtergrond bij een los bericht (zonder handmatig dossier), op aanvraag samengesteld. */
export default async function BerichtAchtergrond({ params }: { params: Params }) {
  await vereisGebruiker();
  const { id } = await params;
  const r = await itemOpId(decodeURIComponent(id));
  if (!r) notFound();
  const { item, inhoud } = r;
  const a = await autoAchtergrond(`bericht:${item.id}`);
  const klaar = a?.status === 'klaar' ? a.inhoud : null;
  const terug = `/achtergrond/${encodeURIComponent(item.id)}`;
  return (
    <main className="pagina">
      <Kop titel="Achtergrond" terug="/" />
      <section className="geopend">
        <h2><a href={item.url} rel="noopener noreferrer" target="_blank">{item.titel} ↗</a></h2>
        <p className="kaart-meta"><span>{inhoud.bronnen.get(item.bron)?.naam ?? item.bron}</span><span>{wanneer(item.gepubliceerd)}</span></p>
        {item.samenvatting && <p>{item.samenvatting}</p>}
      </section>

      <section className="sectie" id="achtergrond">
        <AutoAchtergrondStatus a={a} soort="bericht" id={item.id} terug={terug} beschikbaar={aiBeschikbaar()} />
      </section>

      {klaar && <>
        {klaar.titel && <section className="sectie"><h2>{klaar.titel}</h2><p>{klaar.laatsteOntwikkeling}</p></section>}
        {klaar.watVerandert?.tekst && (
          <section className="sectie blok">
            <h2>Wat verandert dit?</h2>
            {alineas(klaar.watVerandert.tekst).map((t, n) => <p key={n}>{t}</p>)}
            {klaar.watVerandert.onzeker && <p><strong>Nog onzeker:</strong> {klaar.watVerandert.onzeker}</p>}
          </section>
        )}
        {LAGEN.map((l) => {
          const laag = klaar.dossier[l.id];
          return (
            <section key={l.id} className="sectie">
              <h2>{l.naam}</h2>
              {alineas(laag.tekst).map((t, n) => <p key={n}>{t}</p>)}
              {laag.bronnen.length > 0 && (
                <details className="bronnen">
                  <summary>Bronnen ({laag.bronnen.length})</summary>
                  <ul>{laag.bronnen.map((b) => <li key={b.url}><a href={b.url} rel="noopener noreferrer" target="_blank">{b.bron}: {b.titel}</a> {b.datum && <span className="zacht">{datumKort(b.datum)}</span>}</li>)}</ul>
                </details>
              )}
            </section>
          );
        })}
        {klaar.partijen.length > 0 && (
          <section className="sectie">
            <h2>Betrokken partijen</h2>
            <dl className="partijen">{klaar.partijen.map((p) => <div key={p.naam}><dt>{p.naam}</dt><dd>{p.belang}</dd></div>)}</dl>
          </section>
        )}
      </>}
    </main>
  );
}
