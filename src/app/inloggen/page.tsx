import { redirect } from 'next/navigation';
import { craftstudioAan } from '@/lib/craftstudio';
import { huidigeGebruiker } from '@/lib/sessie';
import { testInloggen } from './acties';
import { InlogFormulier } from './formulier';

export const metadata = { title: 'Inloggen · NewsZoom' };

export default async function Inloggen() {
  if (await huidigeGebruiker()) redirect('/');
  const test = process.env.NODE_ENV !== 'production' && !craftstudioAan();
  return (
    <main className="smal">
      <h1 className="merk">NewsZoom</h1>
      <p className="zacht">Volg wat je boeit. Zie wat er verandert.</p>
      <h2>Inloggen</h2>
      <p>Gebruik je craftstudio-account: hetzelfde e-mailadres en wachtwoord als de todo-app.</p>
      <InlogFormulier />
      {test && (
        <form action={testInloggen} className="los">
          <p className="zacht">Lokale ontwikkelomgeving zonder craftstudio-instellingen.</p>
          <button className="knop">Inloggen als testgebruiker</button>
        </form>
      )}
    </main>
  );
}
