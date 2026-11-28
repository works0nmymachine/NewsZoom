import Link from 'next/link';
import type { Versheid } from '@/lib/feeds';
import { Bijgewerkt } from './bijgewerkt';
import { Icoon } from './iconen';
import { HoofdMenu } from './hoofd-menu';
import { TerugKnop } from './terug-knop';

/** Paginakop: titel, optioneel een terugknop, hoe vers het nieuws is, en het menu (filters, bronnen, instellingen). */
export function Kop({ titel, sub, versheid, terug }: { titel: string; sub?: React.ReactNode; versheid?: Versheid; terug?: string }) {
  return (
    <header className="kop">
      {terug && <TerugKnop standaard={terug} />}
      <div className="kop-tekst">
        <h1>{titel}</h1>
        {(sub || versheid) && (
          <p className="kop-sub">
            {sub}
            {sub && versheid && <span aria-hidden="true"> · </span>}
            {versheid && <Bijgewerkt iso={versheid.laatsteSucces} ok={versheid.ok} totaal={versheid.bronnen} />}
          </p>
        )}
      </div>
      <div className="kop-acties">
        <Link className="icoonknop" href="/ontdekken?zoek=1" aria-label="Zoeken"><Icoon naam="zoek" /></Link>
        <HoofdMenu />
      </div>
    </header>
  );
}
