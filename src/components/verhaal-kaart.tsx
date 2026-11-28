import Link from 'next/link';
import type { Samengevoegd } from '@/lib/inhoud';
import type { Verhaal } from '@/lib/inhoud-types';
import { datumKort, wanneerKort } from '@/lib/weergave';

/**
 * Eén lopend verhaal. De samenvatting komt uit het handmatige dossier en draagt daarom de datum ervan.
 * Is er daarna een nieuwer feedbericht aan het verhaal gekoppeld, dan staat dat erboven.
 */
export function VerhaalKaart({ verhaal, inhoud, sinds }: { verhaal: Verhaal; inhoud: Samengevoegd; sinds?: number }) {
  const berichten = inhoud.items.filter((i) => i.verhaal === verhaal.id).sort((a, b) => b.gepubliceerd.localeCompare(a.gepubliceerd));
  const laatste = berichten[0];
  const dossierDatum = berichten.filter((i) => i.herkomst === 'voorbeeldset').map((i) => i.gepubliceerd)[0];
  const nieuwer = laatste && laatste.herkomst === 'feed' ? laatste : null;
  return (
    <article className="kaart">
      <p className="kaart-verhaal">{verhaal.onderwerpen.map((o) => inhoud.onderwerpen.get(o)?.naam ?? o).join(' · ')}</p>
      <h3 className="kaart-titel"><Link href={`/verhaal/${verhaal.id}`}>{verhaal.titel}</Link></h3>
      <p className="kaart-meta">
        {laatste && <span>Laatste bericht {wanneerKort(laatste.gepubliceerd)}</span>}
        {sinds ? <span className="label label-nieuw">{sinds} nieuw sinds je laatste bezoek</span> : null}
      </p>
      {nieuwer && (
        <p className="nieuw"><strong>Nieuwste:</strong> <a href={nieuwer.url} rel="noopener noreferrer" target="_blank">{nieuwer.titel}</a> <span className="zacht">({inhoud.bronnen.get(nieuwer.bron)?.naam ?? nieuwer.bron})</span></p>
      )}
      <p className="nieuw"><strong>{nieuwer ? 'Samenvatting' : 'Laatste ontwikkeling'}{dossierDatum ? ` (${datumKort(dossierDatum)})` : ''}:</strong> {verhaal.laatsteOntwikkeling}</p>
    </article>
  );
}
