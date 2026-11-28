'use client';

import Link from 'next/link';

export default function Fout({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="pagina">
      <h1>Er ging iets mis</h1>
      <p>De pagina kon niet worden geladen. Dat ligt niet aan jou. Probeer het opnieuw; lukt het niet, kijk dan later nog eens.</p>
      <p><button className="knop knop-hoofd" onClick={reset}>Opnieuw proberen</button> <Link className="knop knop-zacht" href="/">Naar Vandaag</Link></p>
    </main>
  );
}
