'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icoon, type IcoonNaam } from './iconen';

export const MENU: { href: string; naam: string; icoon: IcoonNaam }[] = [
  { href: '/filters', naam: 'Mijn filters', icoon: 'filter' },
  { href: '/bronnen', naam: 'Bronnen', icoon: 'bronnen' },
  { href: '/instellingen', naam: 'Instellingen', icoon: 'instellingen' },
  { href: '/instellingen#ai', naam: 'AI en budget', icoon: 'info' },
];

/** Menu rechtsboven: filters, bronnen, instellingen en uitloggen. Sluit met Escape, een tik ernaast of na navigatie. */
export function HoofdMenu() {
  const [open, zetOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pad = usePathname();
  useEffect(() => {
    if (!open) return;
    const toets = (e: KeyboardEvent) => { if (e.key === 'Escape') zetOpen(false); };
    const klik = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) zetOpen(false); };
    document.addEventListener('keydown', toets);
    document.addEventListener('mousedown', klik);
    return () => { document.removeEventListener('keydown', toets); document.removeEventListener('mousedown', klik); };
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <button type="button" className="icoonknop" aria-label="Menu" aria-expanded={open} aria-controls="hoofdmenu" onClick={() => zetOpen(!open)}>
        <Icoon naam="menu" />
      </button>
      {open && (
        <div className="menu-lijst" id="hoofdmenu">
          {MENU.map((m) => (
            <Link key={m.href} href={m.href} className="menu-item" aria-current={!m.href.includes('#') && pad.startsWith(m.href) ? 'page' : undefined} onClick={() => zetOpen(false)}>
              <Icoon naam={m.icoon} />{m.naam}
            </Link>
          ))}
          <form action="/uitloggen" method="post">
            <button className="menu-item"><Icoon naam="uitloggen" />Uitloggen</button>
          </form>
        </div>
      )}
    </div>
  );
}
