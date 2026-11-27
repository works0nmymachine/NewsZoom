import Link from 'next/link';
import type { Samengevoegd } from '@/lib/inhoud';
import type { Verhaal } from '@/lib/inhoud-types';
import { wanneer } from '@/lib/weergave';

/** Eén lopend verhaal met de laatste ontwikkeling en wat die verandert (Mijn Nieuws). */
export function VerhaalKaart({ verhaal, inhoud, sinds }: { verhaal: Verhaal; inhoud: Samengevoegd; sinds?: number }) {
  const laatste = inhoud.items.filter((i) => i.verhaal === verhaal.id).sort((a, b) => b.gepubliceerd.localeCompare(a.gepubliceerd))[0];
  return (
    <article className="kaart">
      <p className="kaart-verhaal">{verhaal.onderwerpen.map((o) => inhoud.onderwerpen.get(o)?.naam ?? o).join(' · ')}</p>
      <h3 className="kaart-titel"><Link href={`/verhaal/${verhaal.id}`}>{verhaal.titel}</Link></h3>
      {laatste && <p className="kaart-meta"><span>Laatste update {wanneer(laatste.gepubliceerd)}</span>{sinds ? <span className="label">{sinds} nieuw sinds je laatste bezoek</span> : null}</p>}
      <p><strong>Laatste ontwikkeling:</strong> {verhaal.laatsteOntwikkeling}</p>
      {verhaal.watVerandert && <p className="zacht">{verhaal.watVerandert.tekst.split(/(?<=[.!?])\s/)[0]}</p>}
    </article>
  );
}
