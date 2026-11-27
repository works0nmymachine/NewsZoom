'use client';

import { useActionState } from 'react';
import { inloggen, type InlogStatus } from './acties';

export function InlogFormulier() {
  const [status, actie, bezig] = useActionState<InlogStatus, FormData>(inloggen, {});
  return (
    <form action={actie} className="formulier">
      <label>E-mailadres<input name="email" type="email" autoComplete="username" required /></label>
      <label>Wachtwoord<input name="wachtwoord" type="password" autoComplete="current-password" required /></label>
      {status.fout && <p className="fout" role="alert">{status.fout}</p>}
      <button className="knop knop-hoofd" disabled={bezig}>{bezig ? 'Bezig…' : 'Inloggen'}</button>
    </form>
  );
}
