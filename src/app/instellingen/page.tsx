import Link from 'next/link';
import { cookies } from 'next/headers';
import { gebiedKiezen, themaKiezen } from '@/app/acties';
import { Icoon } from '@/components/iconen';
import { Kop } from '@/components/kop';
import { OpslaanKnop } from '@/components/opslaan-knop';
import { GEBIEDEN } from '@/lib/gebieden';
import { instellingenVan } from '@/lib/instellingen';
import { vereisGebruiker } from '@/lib/sessie';
import pakket from '../../../package.json';

export const metadata = { title: 'Instellingen · NewsZoom' };

export default async function Instellingen() {
  const g = await vereisGebruiker();
  const [instellingen, jar] = await Promise.all([instellingenVan(g.id), cookies()]);
  const thema = jar.get('nz_thema')?.value ?? 'systeem';
  const commit = process.env.APP_COMMIT?.slice(0, 7);
  return (
    <main className="pagina">
      <Kop titel="Instellingen" terug="/" />

      <section className="sectie">
        <h2>Weergave</h2>
        <form action={themaKiezen} className="blok">
          <fieldset className="filtergroep" style={{ marginBottom: '0.5rem' }}>
            <legend>Thema</legend>
            <div className="keuzes">
              {[['systeem', 'Zoals systeem'], ['licht', 'Licht'], ['donker', 'Donker']].map(([k, naam]) => (
                <label key={k} className="keuze"><input type="radio" name="thema" value={k} defaultChecked={thema === k} /><span>{naam}</span></label>
              ))}
            </div>
          </fieldset>
          <OpslaanKnop />
        </form>
      </section>

      <section className="sectie">
        <h2>Lokaal nieuws</h2>
        <form action={gebiedKiezen} className="blok">
          <fieldset className="filtergroep" style={{ marginBottom: '0.5rem' }}>
            <legend>Gebied op Vandaag</legend>
            <div className="keuzes">
              {GEBIEDEN.map((x) => <label key={x.id} className="keuze"><input type="radio" name="gebied" value={x.id} defaultChecked={instellingen.gebied?.id === x.id} /><span>{x.naam}</span></label>)}
              <label className="keuze"><input type="radio" name="gebied" value="geen" defaultChecked={!instellingen.gebied} /><span>Geen</span></label>
            </div>
          </fieldset>
          <OpslaanKnop />
        </form>
      </section>

      <section className="sectie">
        <h2>Nieuws</h2>
        <ul className="bronlijst">
          <li><Link className="menu-item" href="/filters"><Icoon naam="filter" />Mijn filters</Link></li>
          <li><Link className="menu-item" href="/start"><Icoon naam="ster" />Onderwerpen opnieuw kiezen</Link></li>
          <li><Link className="menu-item" href="/bronnen"><Icoon naam="bronnen" />Bronnen en status</Link></li>
        </ul>
      </section>

      <section className="sectie">
        <h2>Account</h2>
        <div className="blok">
          <p>Ingelogd als <strong>{g.email ?? 'testgebruiker'}</strong> (craftstudio-account).</p>
          <form action="/uitloggen" method="post"><button className="knop knop-klein"><Icoon naam="uitloggen" grootte={16} />Uitloggen</button></form>
        </div>
      </section>

      <p className="zacht">NewsZoom {pakket.version}{commit ? ` · ${commit}` : ''}</p>
    </main>
  );
}
