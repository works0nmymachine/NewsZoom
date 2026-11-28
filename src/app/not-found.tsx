import Link from 'next/link';

export default function NietGevonden() {
  return (
    <main className="pagina">
      <h1>Niet gevonden</h1>
      <p>Deze pagina of dit verhaal bestaat niet (meer). Misschien is het verhaal uit de voorbeeldset gehaald.</p>
      <p><Link className="knop" href="/">Naar Vandaag</Link> <Link className="knop knop-zacht" href="/ontdekken?zoek=1">Zoeken</Link></p>
    </main>
  );
}
