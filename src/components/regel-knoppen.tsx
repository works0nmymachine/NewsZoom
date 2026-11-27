import { regelActie } from '@/app/acties';
import type { Actie, DoelSoort, Regel } from '@/lib/filters';
import { ACTIE_NAAM } from '@/lib/weergave';

type Doel = { soort: DoelSoort; id: string; naam: string };

/** Meer / Minder / Verbergen voor een verhaal, onderwerp of bron. Werkt zonder JavaScript. */
export function RegelKnoppen({ doelen, regels, terug }: { doelen: Doel[]; regels: Regel[]; terug: string }) {
  return (
    <details className="aanpassen">
      <summary>Aanpassen</summary>
      <div className="aanpassen-paneel">
        {doelen.map((d) => {
          const huidig = regels.find((r) => r.doelSoort === d.soort && r.doelId === d.id);
          return (
            <form key={`${d.soort}:${d.id}`} action={regelActie} className="regelrij">
              <input type="hidden" name="soort" value={d.soort} />
              <input type="hidden" name="id" value={d.id} />
              <input type="hidden" name="terug" value={terug} />
              <span className="regelrij-doel"><span className="zacht">{d.soort === 'verhaal' ? 'Verhaal' : d.soort === 'onderwerp' ? 'Onderwerp' : 'Bron'}:</span> {d.naam}</span>
              <span className="regelrij-knoppen">
                {(['meer', 'minder', 'verbergen'] as Actie[]).map((a) => (
                  <button key={a} name="actie" value={a} className="chip" aria-pressed={huidig?.actie === a}>
                    {ACTIE_NAAM[a]}
                  </button>
                ))}
                {huidig && <button name="actie" value="wissen" className="chip chip-zacht">Wissen</button>}
              </span>
            </form>
          );
        })}
      </div>
    </details>
  );
}
