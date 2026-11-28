import Link from 'next/link';
import { achtergrondAanvragen } from '@/app/acties';
import type { AutoAchtergrond } from '@/lib/achtergrond';
import { wanneer } from '@/lib/weergave';

const PROVIDER = { openai: 'OpenAI', anthropic: 'Claude (Anthropic)' } as Record<string, string>;

function Aanvraagknop({ soort, id, terug, tekst }: { soort: 'verhaal' | 'bericht'; id: string; terug: string; tekst: string }) {
  return (
    <form action={achtergrondAanvragen}>
      <input type="hidden" name="soort" value={soort} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="terug" value={terug} />
      <button className="knop knop-klein knop-hoofd">{tekst}</button>
    </form>
  );
}

/** Status en knoppen rond een automatisch samengestelde achtergrond. Ververst zichzelf zolang hij loopt. */
export function AutoAchtergrondStatus({ a, soort, id, terug, beschikbaar }: {
  a: AutoAchtergrond | null; soort: 'verhaal' | 'bericht'; id: string; terug: string; beschikbaar: boolean;
}) {
  if (!a) {
    if (!beschikbaar) return <p className="zacht">Automatisch samenstellen kan nog niet: er is geen taalmodel ingesteld. Zie <Link href="/instellingen#ai">Instellingen</Link>.</p>;
    return (
      <div className="blok">
        <p>Laat NewsZoom een achtergrond samenstellen. Een taalmodel zoekt eerdere berichtgeving op het web en schrijft de lagen Kort, Deze week, Afgelopen maanden en Vanaf het begin, met bronnen.</p>
        <p className="zacht">Duurt meestal één tot drie minuten en gaat van het maandbudget af.</p>
        <Aanvraagknop soort={soort} id={id} terug={terug} tekst="Achtergrond laten samenstellen" />
      </div>
    );
  }
  if (a.status === 'wachtend' || a.status === 'bezig') {
    return (
      <div className="blok" aria-live="polite">
        <meta httpEquiv="refresh" content="10" />
        <p><strong>{a.status === 'wachtend' ? 'In de wachtrij…' : 'Bezig met zoeken en schrijven…'}</strong></p>
        <p className="zacht">Aangevraagd {wanneer(new Date(a.aangevraagd_at).toISOString())}. Deze pagina ververst elke 10 seconden.</p>
      </div>
    );
  }
  if (a.status === 'mislukt') {
    return (
      <div className="blok">
        <p className="fout">Samenstellen is mislukt: {a.fout ?? 'onbekende fout'}</p>
        {beschikbaar && <Aanvraagknop soort={soort} id={id} terug={terug} tekst="Opnieuw proberen" />}
      </div>
    );
  }
  return (
    <div className="auto-label">
      <p className="zacht">
        <span className="label">Automatisch samengesteld</span> door {PROVIDER[a.provider ?? ''] ?? a.provider}
        {a.klaar_at ? ` op ${wanneer(new Date(a.klaar_at).toISOString())}` : ''}. Niet gecontroleerd door een redactie; controleer belangrijke feiten bij de bronnen.
        {a.inhoud?.weggelatenLinks ? ` ${a.inhoud.weggelatenLinks} niet-controleerbare ${a.inhoud.weggelatenLinks === 1 ? 'link is' : 'links zijn'} weggelaten.` : ''}
      </p>
      {beschikbaar && <Aanvraagknop soort={soort} id={id} terug={terug} tekst="Opnieuw samenstellen" />}
    </div>
  );
}
