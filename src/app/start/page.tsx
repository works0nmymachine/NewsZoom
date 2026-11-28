import { startOpslaan } from '@/app/acties';
import { GEBIEDEN } from '@/lib/gebieden';
import { instellingenVan } from '@/lib/instellingen';
import { paginaContext } from '@/lib/pagina';

export const metadata = { title: 'Je nieuws instellen · NewsZoom' };

/** Eerste keer: onderwerpen (meer of minder) en een lokaal gebied. Alles is over te slaan en later aan te passen. */
export default async function Start() {
  const { gebruiker, regels, inhoud } = await paginaContext();
  const instellingen = await instellingenVan(gebruiker.id);
  const onderwerpen = [...inhoud.onderwerpen.values()].sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
  const huidig = (id: string) => regels.find((r) => r.doelSoort === 'onderwerp' && r.doelId === id)?.actie;
  return (
    <main className="pagina">
      <header className="kop"><div className="kop-tekst"><h1>Je nieuws instellen</h1><p className="kop-sub">Twee vragen. Je kunt alles overslaan en later aanpassen in Mijn filters.</p></div></header>
      <form action={startOpslaan}>
        <section className="sectie">
          <h2>1. Welke onderwerpen?</h2>
          <p className="zacht">Kies <strong>Meer</strong> voor wat je wilt volgen en <strong>Minder</strong> voor wat je liever minder ziet. Niets kiezen is ook goed.</p>
          <div className="blok">
            {onderwerpen.map((o) => (
              <fieldset key={o.id} className="start-onderwerp" style={{ border: 0, margin: 0 }}>
                <legend className="sr-only">{o.naam}</legend>
                <span aria-hidden="true">{o.naam}</span>
                <span className="keuzes">
                  <label className="keuze"><input type="radio" name={`o:${o.id}`} value="meer" defaultChecked={huidig(o.id) === 'meer'} /><span>Meer</span></label>
                  <label className="keuze keuze-neutraal"><input type="radio" name={`o:${o.id}`} value="" defaultChecked={!huidig(o.id) || huidig(o.id) === 'verbergen'} /><span>Gewoon</span></label>
                  <label className="keuze"><input type="radio" name={`o:${o.id}`} value="minder" defaultChecked={huidig(o.id) === 'minder'} /><span>Minder</span></label>
                </span>
              </fieldset>
            ))}
          </div>
        </section>
        <section className="sectie">
          <h2>2. Welk lokaal nieuws?</h2>
          <p className="zacht">De proef dekt Amsterdam. Andere gebieden volgen later.</p>
          <div className="keuzes">
            {GEBIEDEN.map((g) => <label key={g.id} className="keuze"><input type="radio" name="gebied" value={g.id} defaultChecked={(instellingen.gebied?.id ?? 'amsterdam') === g.id} /><span>{g.naam}</span></label>)}
            <label className="keuze"><input type="radio" name="gebied" value="geen" defaultChecked={instellingen.gebiedGekozen && !instellingen.gebied} /><span>Geen lokaal nieuws</span></label>
          </div>
        </section>
        <div className="start-knoppen">
          <button className="knop knop-hoofd" name="wat" value="klaar">Klaar</button>
          <button className="knop knop-zacht" name="wat" value="overslaan" formNoValidate>Overslaan</button>
        </div>
      </form>
    </main>
  );
}
