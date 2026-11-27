import Link from 'next/link';

export function AgendaTabs({ actief }: { actief: 'agenda' | 'uit' | 'films' }) {
  return (
    <nav className="segmenten" aria-label="Agenda-onderdelen">
      <Link href="/agenda" aria-current={actief === 'agenda' ? 'page' : undefined}>Agenda</Link>
      <Link href="/agenda/uit" aria-current={actief === 'uit' ? 'page' : undefined}>Uitagenda</Link>
      <Link href="/agenda/films" aria-current={actief === 'films' ? 'page' : undefined}>Films</Link>
    </nav>
  );
}
