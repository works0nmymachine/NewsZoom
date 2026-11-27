import Link from 'next/link';
import { beoordeel, type Regel } from '@/lib/filters';
import type { Item, Samengevoegd } from '@/lib/inhoud';
import { beschrijfRegel, wanneer } from '@/lib/weergave';
import { RegelKnoppen } from './regel-knoppen';

export function BerichtKaart({ item, inhoud, regels, terug, toonVerhaal = true, compact = false }: {
  item: Item; inhoud: Samengevoegd; regels: Regel[]; terug: string; toonVerhaal?: boolean; compact?: boolean;
}) {
  const bron = inhoud.bronnen.get(item.bron);
  const verhaal = item.verhaal ? inhoud.verhalen.get(item.verhaal) : undefined;
  const b = beoordeel(item, regels);
  const doelen = [
    ...(verhaal ? [{ soort: 'verhaal' as const, id: verhaal.id, naam: verhaal.titel }] : []),
    ...item.onderwerpen.map((o) => ({ soort: 'onderwerp' as const, id: o, naam: inhoud.onderwerpen.get(o)?.naam ?? o })),
    { soort: 'bron' as const, id: item.bron, naam: bron?.naam ?? item.bron },
  ];
  const open = verhaal ? `/verhaal/${verhaal.id}?bericht=${encodeURIComponent(item.id)}` : item.url;
  return (
    <article className={`kaart${b.zichtbaar ? '' : ' kaart-verborgen'}`}>
      {!b.zichtbaar && b.doorslaggevend && (
        <p className="verborgen-melding">Verborgen in je gefilterde weergave. {beschrijfRegel(b.doorslaggevend, inhoud)}</p>
      )}
      {toonVerhaal && verhaal && <p className="kaart-verhaal">{verhaal.titel}</p>}
      <h3 className="kaart-titel">
        {verhaal ? <Link href={open}>{item.titel}</Link> : <a href={item.url} rel="noopener noreferrer" target="_blank">{item.titel}</a>}
      </h3>
      <p className="kaart-meta">
        <span>{bron?.naam ?? item.bron}</span>
        <span>{wanneer(item.gepubliceerd)}</span>
        {item.soort === 'mededeling' && <span className="label">Mededeling</span>}
        {item.herkomst === 'feed' && <span className="label label-zacht">Uit feed</span>}
      </p>
      {item.samenvatting && !compact && <p>{item.samenvatting}</p>}
      {item.nieuw && <p className="nieuw"><strong>Nieuw:</strong> {item.nieuw}</p>}
      <div className="kaart-acties">
        {verhaal && <Link className="knop knop-klein" href={`/verhaal/${verhaal.id}?bericht=${encodeURIComponent(item.id)}#achtergrond`}>Achtergrond</Link>}
        <a className="knop knop-klein knop-zacht" href={item.url} rel="noopener noreferrer" target="_blank">Lees bij {bron?.naam ?? 'de bron'} ↗</a>
        <details className="waarom">
          <summary>Waarom zie ik dit?</summary>
          <div className="waarom-paneel">
            {b.doorslaggevend ? <p>Doorslaggevend: {beschrijfRegel(b.doorslaggevend, inhoud)}</p> : <p>Geen persoonlijke regel. Geselecteerd op belang en actualiteit{item.belang >= 3 ? ': dit hoort bij de belangrijkste ontwikkelingen van de dag' : ''}.</p>}
            {b.toegepast.length > 1 && (
              <ul>{b.toegepast.filter((r) => r !== b.doorslaggevend).map((r) => <li key={r.id}>Ook van toepassing: {beschrijfRegel(r, inhoud)}</li>)}</ul>
            )}
            <p className="zacht"><Link href="/filters">Mijn filters bekijken</Link></p>
          </div>
        </details>
        <RegelKnoppen doelen={doelen} regels={regels} terug={terug} />
      </div>
    </article>
  );
}
