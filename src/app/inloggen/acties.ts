'use server';

import { redirect } from 'next/navigation';
import { craftstudioAan, craftstudioControle, InlogFout } from '@/lib/craftstudio';
import { gebruikerVoor, startSessie } from '@/lib/sessie';

export type InlogStatus = { fout?: string };

export async function inloggen(_vorige: InlogStatus, form: FormData): Promise<InlogStatus> {
  const email = String(form.get('email') ?? '');
  const wachtwoord = String(form.get('wachtwoord') ?? '');
  if (!craftstudioAan()) return { fout: 'Inloggen met craftstudio is op deze server nog niet ingesteld.' };
  try {
    const g = await craftstudioControle(email, wachtwoord);
    if (!g) return { fout: 'E-mailadres of wachtwoord klopt niet.' };
    await startSessie(await gebruikerVoor(g.id, g.email));
  } catch (e) {
    if (e instanceof InlogFout) return { fout: e.message };
    throw e;
  }
  redirect('/');
}

/** Alleen buiten productie en zonder craftstudio-instellingen: lokaal testen zonder account. */
export async function testInloggen() {
  if (process.env.NODE_ENV === 'production' || craftstudioAan()) redirect('/inloggen');
  await startSessie(await gebruikerVoor(null, 'test@lokaal'));
  redirect('/');
}
