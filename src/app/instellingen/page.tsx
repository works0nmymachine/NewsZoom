import Link from 'next/link';
import { aiInstellen, bronToevoegen, bronWijzig } from '@/app/acties';
import { Kop } from '@/components/kop';
import { aiOverzicht } from '@/lib/ai-gebruik';
import { achtergrondDomeinen, DOELEN, doelVanFeed, FEED_DOELEN, feedBronnenMetStatus, koersBronnen, vasteBronnen, type Doel, type FeedBronRij } from '@/lib/bronnen';
import { vereisGebruiker } from '@/lib/sessie';
import { wanneer } from '@/lib/weergave';

type Zoek = Promise<{ doel?: string; bron?: string; n?: string; ai?: string }>;

const usd = (x: number) => `$${x.toFixed(x < 1 ? 3 : 2)}`;
const getal = (x: number) => new Intl.NumberFormat('nl-NL').format(x);
const PROVIDER = { openai: 'OpenAI', anthropic: 'Claude (Anthropic)' } as Record<string, string>;

const BRON_MELDING: Record<string, { tekst: (n: string) => string; fout?: boolean }> = {
  toegevoegd: { tekst: (n) => `Bron toegevoegd. ${n} ${n === '1' ? 'bericht' : 'berichten'} opgehaald; daarna elke 20 minuten.` },
  leeg: { tekst: () => 'Feed gevonden en toegevoegd, maar er stonden nog geen (nieuwe) berichten in.' },
  voorstel: { tekst: () => 'Geen automatisch te volgen feed gevonden. De bron is als voorstel bewaard.' },
  bestaat: { tekst: () => 'Deze feed wordt al gevolgd.', fout: true },
  geweigerd: { tekst: () => 'Dit adres is niet toegestaan (alleen publieke websites via http of https, standaardpoort).', fout: true },
  onbereikbaar: { tekst: () => 'De website reageerde niet of gaf een fout. Controleer het adres.', fout: true },
  url: { tekst: () => 'Het webadres moet beginnen met http:// of https://.', fout: true },
};

export default async function Instellingen({ searchParams }: { searchParams: Zoek }) {
  const z = await searchParams;
  const g = await vereisGebruiker();
  const [ai, feeds, koersen, domeinen] = await Promise.all([aiOverzicht(), feedBronnenMetStatus(), koersBronnen(), achtergrondDomeinen()]);
  const vast = vasteBronnen();
  const perDoel = (d: Doel) => feeds.filter((b) => doelVanFeed(b) === d);

  return (
    <main className="pagina">
      <Kop titel="Instellingen" sub={g.email ?? undefined} />
      <nav className="segmenten segmenten-klein" aria-label="Onderdelen">
        <a href="#filters">Filters</a><a href="#ai">AI en budget</a><a href="#bronnen">Bronnen</a><a href="#account">Account</a>
      </nav>

      <section className="sectie" id="filters">
        <h2>Filters</h2>
        <p>Je filters per sectie: Nieuws, Eigen interesses, Finance en Agenda.</p>
        <Link className="knop knop-klein" href="/filters">Mijn filters openen</Link>
      </section>

      <section className="sectie" id="ai">
        <h2>AI en budget</h2>
        <p className="zacht">Gebruikt voor <strong>Achtergrond laten samenstellen</strong>. Instellingen gelden voor de hele app.</p>
        {z.ai === 'opgeslagen' && <p className="gelukt">Opgeslagen.</p>}
        {z.ai === 'budget' && <p className="fout">Budget moet tussen 0 en 500 dollar liggen.</p>}
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
            <p className="zacht" style={{ fontSize: '0.82rem' }}>
              Kosten berekend met de publieke API-prijzen van {ai.peildatum}, in dollar, zonder btw. Vóór elke aanroep wordt de maximale prijs gereserveerd;
              past die niet meer in het budget, dan start de aanroep niet. Een API-key is los van een Plus- of Pro-abonnement en wordt per gebruik afgerekend.
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
              Nu actief: {ai.actief ? `${PROVIDER[ai.actief.provider]} met ${ai.actief.model}` : 'geen (geen key of uitgezet)'}.
              Een key zet je op de server in <code>.env.newszoom</code> (<code>OPENAI_API_KEY</code> of <code>ANTHROPIC_API_KEY</code>), nooit hier.
              Webzoeken kost bij beide ${ai.lijst.openai.zoeken_per_1000} per 1000 zoekopdrachten.
            </p>
            <button className="knop knop-hoofd">Opslaan</button>
          </form>

          {ai.laatste.length > 0 && (
            <details className="sectie">
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
                        <td title={a.fout ?? undefined}>{a.status === 'klaar' ? 'klaar' : a.status === 'bezig' ? 'bezig' : <span className="fout">mislukt</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>}
      </section>

      <section className="sectie" id="bronnen">
        <h2>Bronnen per doel</h2>
        <p className="zacht">Welke bronnen NewsZoom nu gebruikt, waarvoor, en wanneer ze voor het laatst zijn gecontroleerd. Eigen interesses zoeken in alle nieuwsbronnen.</p>

        {(Object.keys(DOELEN) as Doel[]).map((d) => (
          <section key={d} className="sectie blok" id={`bronnen-${d}`}>
            <h3 style={{ marginTop: 0 }}>{DOELEN[d].naam}</h3>
            <p className="zacht">{DOELEN[d].uitleg}</p>
            {z.doel === d && z.bron && BRON_MELDING[z.bron] && (
              <p className={BRON_MELDING[z.bron].fout ? 'fout' : 'gelukt'}>{BRON_MELDING[z.bron].tekst(z.n ?? '0')}</p>
            )}

            {FEED_DOELEN.includes(d) && <FeedLijst bronnen={perDoel(d)} doel={d} />}

            {d === 'finance' && (
              <>
                <h4>Koersen</h4>
                {koersen.length === 0 ? <p className="zacht">Nog geen koersen opgehaald; de app gebruikt de momentopname.</p> : koersen.map((k) => (
                  <div key={k.reeks} className="bronrij">
                    <div><strong>{k.reeks.toUpperCase()}</strong> via {k.bron}</div>
                    <div className="zacht">{k.laatste_controle ? (k.laatste_fout ? <span className="fout">mislukt {wanneer(k.laatste_controle.toISOString())}: {k.laatste_fout}</span> : <>gecontroleerd {wanneer(k.laatste_controle.toISOString())}</>) : 'nog niet gecontroleerd'}</div>
                  </div>
                ))}
                <h4>Handmatig verzameld (voorbeeldset)</h4>
                <p className="zacht">{vast.finance.map((b) => b.naam).join(', ')}</p>
              </>
            )}

            {d === 'agenda' && (
              <>
                <details>
                  <summary className="zacht">{vast.agenda.length} bronnen in de voorbeeldset</summary>
                  <ul className="zacht">{vast.agenda.map((b) => <li key={b.naam}><a href={b.url} rel="noopener noreferrer" target="_blank">{b.naam}</a> ({b.aantal})</li>)}</ul>
                </details>
              </>
            )}

            {d === 'achtergrond' && (
              <>
                <p>Zoekt via {ai.ok && ai.actief ? `${PROVIDER[ai.actief.provider]} (${ai.actief.model})` : 'het ingestelde taalmodel'}; maximaal 8 zoekopdrachten per achtergrond. Daarnaast krijgt het model de berichten die NewsZoom al bij het verhaal heeft.</p>
                {domeinen.length > 0
                  ? <p className="zacht">Meest gebruikt in eerdere achtergronden: {domeinen.map((x) => `${x.domein} (${x.aantal})`).join(', ')}.</p>
                  : <p className="zacht">Nog geen automatische achtergronden gemaakt.</p>}
              </>
            )}

            {d !== 'achtergrond' && (
              <details className="bron-toevoegen" open={z.doel === d && !!z.bron && !!BRON_MELDING[z.bron]?.fout}>
                <summary className="knop knop-klein">{FEED_DOELEN.includes(d) ? 'Bron toevoegen' : 'Bron voorstellen'}</summary>
                <form action={bronToevoegen} className="formulier">
                  <input type="hidden" name="doel" value={d} />
                  <label>Webadres<input name="url" type="url" required maxLength={500} placeholder="https://www.voorbeeld.nl of de feed zelf" /></label>
                  <label>Naam (optioneel)<input name="naam" maxLength={200} /></label>
                  {FEED_DOELEN.includes(d)
                    ? <p className="zacht" style={{ margin: 0 }}>NewsZoom zoekt de RSS- of Atom-feed van de site en haalt direct de eerste berichten op. Zonder feed wordt het een voorstel.</p>
                    : <p className="zacht" style={{ margin: 0 }}>Wordt bewaard als voorstel; de agenda haalt nog niet automatisch op.</p>}
                  <button className="knop knop-hoofd">{FEED_DOELEN.includes(d) ? 'Toevoegen' : 'Voorstellen'}</button>
                </form>
              </details>
            )}
          </section>
        ))}
      </section>

      <section className="sectie" id="account">
        <h2>Account</h2>
        <p>Ingelogd met je craftstudio-account{g.email ? ` (${g.email})` : ''}.</p>
        <form action="/uitloggen" method="post"><button className="knop knop-klein">Uitloggen</button></form>
      </section>
    </main>
  );
}

function FeedLijst({ bronnen, doel }: { bronnen: FeedBronRij[]; doel: Doel }) {
  if (!bronnen.length) return <p className="zacht">Nog geen automatisch gevolgde bronnen.</p>;
  return (
    <div>
      {bronnen.map((b) => (
        <div key={b.id} className="bronrij">
          <div>
            <a href={b.homepage} rel="noopener noreferrer" target="_blank">{b.naam}</a>
            {b.herkomst === 'gebruiker' && <span className="label label-zacht">Toegevoegd</span>}
            {b.gepauzeerd && <span className="label">Gepauzeerd</span>}
            <div className="zacht" style={{ fontSize: '0.82rem' }}>
              {b.items_7d} {b.items_7d === 1 ? 'bericht' : 'berichten'} deze week ·{' '}
              {b.laatste_controle
                ? (b.laatste_fout
                  ? <span className="fout">controle {wanneer(b.laatste_controle.toISOString())} mislukt ({b.laatste_fout})</span>
                  : <>gecontroleerd {wanneer(b.laatste_controle.toISOString())}</>)
                : 'nog niet gecontroleerd'}
            </div>
          </div>
          <form action={bronWijzig}>
            <input type="hidden" name="id" value={b.id} />
            <input type="hidden" name="doel" value={doel} />
            <button className="chip" name="wat" value={b.gepauzeerd ? 'hervat' : 'pauzeer'}>{b.gepauzeerd ? 'Hervatten' : 'Pauzeren'}</button>
            {b.herkomst === 'gebruiker' && <button className="chip chip-zacht" name="wat" value="verwijder">Verwijderen</button>}
          </form>
        </div>
      ))}
    </div>
  );
}
