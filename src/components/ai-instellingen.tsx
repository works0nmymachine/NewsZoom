import { aiInstellen } from '@/app/acties';
import { aiOverzicht } from '@/lib/ai-gebruik';
import { wanneer } from '@/lib/weergave';

const usd = (x: number) => `$${x.toFixed(x < 1 ? 3 : 2)}`;
const getal = (x: number) => new Intl.NumberFormat('nl-NL').format(x);
export const PROVIDER_NAAM: Record<string, string> = { openai: 'OpenAI', anthropic: 'Claude (Anthropic)' };

/** AI en budget: tokenteller van deze maand, provider- en modelkeuze, budget en de laatste aanroepen. */
export async function AiInstellingen({ status }: { status?: string }) {
  const ai = await aiOverzicht();
  return (
    <section className="sectie" id="ai">
      <h2>AI en budget</h2>
      <p className="zacht">Gebruikt voor <strong>Achtergrond laten samenstellen</strong>. Deze instellingen gelden voor de hele app.</p>
      {status === 'opgeslagen' && <p className="gelukt">Opgeslagen.</p>}
      {status === 'budget' && <p className="fout">Het budget moet tussen 0 en 500 dollar liggen.</p>}
      {!ai.ok ? <p className="fout">De AI-tabellen ontbreken nog; draai de migratie.</p> : <>
        <div className="blok">
          <p style={{ margin: 0 }}>
            <strong>Deze maand ({ai.maand}):</strong> {usd(ai.besteed)} van {usd(ai.budget)}
            {ai.besteed >= ai.budget && <span className="label">Budget op</span>}
          </p>
          <div className={`meter${ai.besteed >= ai.budget ? ' meter-vol' : ''}`} role="meter" aria-valuemin={0} aria-valuemax={ai.budget} aria-valuenow={ai.besteed} aria-label="Besteed van maandbudget">
            <span style={{ width: `${Math.min(100, ai.budget ? (ai.besteed / ai.budget) * 100 : 100)}%` }} />
          </div>
          <dl className="cijfers">
            <div><dt>Aanroepen</dt><dd>{ai.totalen.aanroepen}{ai.totalen.mislukt ? ` (${ai.totalen.mislukt} mislukt)` : ''}</dd></div>
            <div><dt>Invoertokens</dt><dd>{getal(ai.totalen.invoer)}</dd></div>
            <div><dt>Waarvan cache</dt><dd>{getal(ai.totalen.cache)}</dd></div>
            <div><dt>Uitvoertokens</dt><dd>{getal(ai.totalen.uitvoer)}</dd></div>
            <div><dt>Webzoekopdrachten</dt><dd>{getal(ai.totalen.zoek)}</dd></div>
          </dl>
          <p className="zacht" style={{ fontSize: '0.82rem', marginBottom: 0 }}>
            Kosten berekend met de publieke API-prijzen van {ai.peildatum}, in dollar, zonder btw. Vóór elke aanroep wordt de maximale prijs
            gereserveerd; past die niet meer in het budget, dan start de aanroep niet. Een API-key staat los van een Plus- of Pro-abonnement en wordt per gebruik afgerekend.
          </p>
        </div>

        <form action={aiInstellen} className="formulier blok">
          <label>Taalmodel
            <select name="provider" defaultValue={ai.gekozen === 'automatisch' ? (ai.actief?.provider ?? 'openai') : ai.gekozen}>
              <option value="openai">OpenAI{ai.keys.openai ? '' : ' (geen key op de server)'}</option>
              <option value="anthropic">Claude (Anthropic){ai.keys.anthropic ? '' : ' (geen key op de server)'}</option>
              <option value="uit">Uit</option>
            </select>
          </label>
          <label>Model bij OpenAI
            <select name="openai_model" defaultValue={ai.modellen.openai}>
              {Object.entries(ai.lijst.openai.modellen).map(([m, p]) => <option key={m} value={m}>{m}: ${p.invoer} / ${p.uitvoer} per miljoen tokens</option>)}
            </select>
          </label>
          <label>Model bij Claude
            <select name="anthropic_model" defaultValue={ai.modellen.anthropic}>
              {Object.entries(ai.lijst.anthropic.modellen).map(([m, p]) => <option key={m} value={m}>{m}: ${p.invoer} / ${p.uitvoer} per miljoen tokens</option>)}
            </select>
          </label>
          <label>Maandbudget in dollar
            <input name="budget" inputMode="decimal" defaultValue={String(ai.budget)} />
          </label>
          <p className="zacht" style={{ margin: 0 }}>
            Nu actief: {ai.actief ? `${PROVIDER_NAAM[ai.actief.provider]} met ${ai.actief.model}` : 'geen (geen key of uitgezet)'}.
            Een key zet je op de server in <code>.env.newszoom</code> (<code>OPENAI_API_KEY</code> of <code>ANTHROPIC_API_KEY</code>), nooit hier.
            Webzoeken kost bij beide ${ai.lijst.openai.zoeken_per_1000} per 1000 zoekopdrachten.
          </p>
          <button className="knop knop-hoofd">Opslaan</button>
        </form>

        {ai.laatste.length > 0 && (
          <details className="blok">
            <summary><strong>Laatste aanroepen</strong></summary>
            <div className="tabel-wrap">
              <table className="tabel-klein">
                <thead><tr><th>Wanneer</th><th>Waarvoor</th><th>Model</th><th>In</th><th>Uit</th><th>Zoek</th><th>Kosten</th><th>Status</th></tr></thead>
                <tbody>
                  {ai.laatste.map((a) => (
                    <tr key={a.id}>
                      <td>{wanneer(new Date(a.moment).toISOString())}</td>
                      <td>{a.doel.replace(/^achtergrond:/, '')}</td>
                      <td>{a.model}</td>
                      <td>{getal(a.invoer_tokens)}</td>
                      <td>{getal(a.uitvoer_tokens)}</td>
                      <td>{a.zoekopdrachten}</td>
                      <td>{a.kosten_usd != null ? usd(a.kosten_usd) : `≤ ${usd(a.geschat_usd)}`}</td>
                      <td title={a.fout ?? undefined}>{a.status === 'mislukt' ? <span className="fout">mislukt</span> : a.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </>}
    </section>
  );
}
