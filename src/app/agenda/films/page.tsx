import { AgendaTabs } from '@/components/agenda-tabs';
import { Kop } from '@/components/kop';
import { agenda, vandaagIso } from '@/lib/agenda-data';
import { vereisGebruiker } from '@/lib/sessie';
import Link from 'next/link';

type Zoek = Promise<{ genre?: string }>;
const dFmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' });

export default async function Films({ searchParams }: { searchParams: Zoek }) {
  const z = await searchParams;
  await vereisGebruiker();
  const { films } = agenda();
  const vandaag = vandaagIso();
  const genres = [...new Set(films.flatMap((f) => f.genre.split(/[,/]\s*/)))].filter((g) => g && !g.startsWith('onbekend')).sort();
  const lijst = films.filter((f) => f.releasedatum >= vandaag && (!z.genre || f.genre.includes(z.genre))).sort((a, b) => a.releasedatum.localeCompare(b.releasedatum));
  return (
    <main className="pagina">
      <Kop titel="Films" sub="Nederlandse bioscoopreleases" />
      <AgendaTabs actief="films" />
      <div className="filters-rij">
        <Link className="chip" href="/agenda/films" aria-pressed={!z.genre}>Alle genres</Link>
        {genres.map((g) => <Link key={g} className="chip" href={`/agenda/films?genre=${encodeURIComponent(g)}`} aria-pressed={z.genre === g}>{g}</Link>)}
      </div>
      {lijst.length === 0 && <p className="leeg">Geen aankomende releases gevonden.</p>}
      {lijst.map((f) => (
        <article key={f.id} className="kaart">
          <p className="evenement-datum">{dFmt.format(new Date(`${f.releasedatum}T00:00:00Z`))} <span className="label label-zacht">Landelijke release</span></p>
          <h3 className="kaart-titel">{f.titel}</h3>
          <p className="kaart-meta"><span>{f.genre}</span><a href={f.bron.url} rel="noopener noreferrer" target="_blank">{f.bron.naam} ↗</a></p>
        </article>
      ))}
      <p className="zacht">Lokale voorstellingen per bioscoop en streamingreleases volgen later als aparte vermeldingen.</p>
    </main>
  );
}
