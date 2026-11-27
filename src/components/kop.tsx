import Link from 'next/link';

export function Kop({ titel, sub }: { titel: string; sub?: string }) {
  return (
    <header className="kop">
      <div>
        <h1>{titel}</h1>
        {sub && <p className="zacht">{sub}</p>}
      </div>
      <div className="kop-acties">
        <Link className="knop knop-klein knop-zacht" href="/filters">Mijn filters</Link>
        <form action="/uitloggen" method="post"><button className="knop knop-klein knop-zacht">Uitloggen</button></form>
      </div>
    </header>
  );
}

export function Voorbeeldlabel({ peildatum }: { peildatum: string | null }) {
  if (!peildatum) return null;
  const d = new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(peildatum));
  return <p className="voorbeeld">Voorbeeldset: echte berichten, handmatig verzameld tot {d}. Samenvattingen in eigen woorden; links gaan naar de oorspronkelijke bron.</p>;
}
