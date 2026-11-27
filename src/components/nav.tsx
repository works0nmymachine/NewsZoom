'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', naam: 'Vandaag', icoon: '◎' },
  { href: '/mijn-nieuws', naam: 'Mijn Nieuws', icoon: '★' },
  { href: '/ontdekken', naam: 'Ontdekken', icoon: '⌕' },
  { href: '/finance', naam: 'Finance', icoon: '↗' },
  { href: '/agenda', naam: 'Agenda', icoon: '▦' },
];

export function Nav() {
  const pad = usePathname();
  return (
    <nav className="tabbalk" aria-label="Hoofdnavigatie">
      {TABS.map((t) => {
        const actief = t.href === '/' ? pad === '/' : pad.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className="tab" aria-current={actief ? 'page' : undefined}>
            <span aria-hidden="true" className="tab-icoon">{t.icoon}</span>
            {t.naam}
          </Link>
        );
      })}
    </nav>
  );
}
