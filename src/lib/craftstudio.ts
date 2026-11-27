/**
 * Inloggen met je craftstudio-account: dezelfde Supabase-login als todo.craftstudio.work.
 * NewsZoom stuurt e-mail en wachtwoord één keer door naar Supabase Auth (password grant),
 * bewaart alleen de vaste gebruikers-id en trekt de uitgegeven Supabase-sessie direct weer in.
 * Aan zolang CRAFTSTUDIO_AUTH_URL en CRAFTSTUDIO_AUTH_KEY (de publieke anon key) gezet zijn.
 */
export type CraftstudioGebruiker = { id: string; email: string };

export class InlogFout extends Error {}

const pogingen = new Map<string, { mislukt: number; tot: number }>();
const MAX_MISLUKT = 5;
const WACHT_MS = 15 * 60 * 1000;
export function wisPogingen() { pogingen.clear(); }

export function craftstudioAan(env: NodeJS.ProcessEnv = process.env) {
  return !!(env.CRAFTSTUDIO_AUTH_URL && env.CRAFTSTUDIO_AUTH_KEY);
}

export async function craftstudioControle(
  email: string, wachtwoord: string,
  { env = process.env, doeFetch = fetch }: { env?: NodeJS.ProcessEnv; doeFetch?: typeof fetch } = {},
): Promise<CraftstudioGebruiker | null> {
  const basis = env.CRAFTSTUDIO_AUTH_URL?.replace(/\/+$/, '');
  const sleutel = env.CRAFTSTUDIO_AUTH_KEY;
  if (!basis || !sleutel) throw new InlogFout('Inloggen met craftstudio staat niet aan.');
  const adres = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adres) || adres.length > 254 || !wachtwoord || wachtwoord.length > 200) return null;
  const nu = Date.now();
  const rem = pogingen.get(adres);
  if (rem && rem.tot > nu && rem.mislukt >= MAX_MISLUKT) throw new InlogFout('Te veel inlogpogingen. Wacht een kwartier en probeer het opnieuw.');
  const mislukt = () => {
    const oud = pogingen.get(adres);
    const n = oud && oud.tot > nu ? oud.mislukt + 1 : 1;
    pogingen.set(adres, { mislukt: n, tot: nu + WACHT_MS });
    if (pogingen.size > 5000) for (const [k, v] of pogingen) if (v.tot <= nu) pogingen.delete(k);
    return null;
  };
  const kop = { apikey: sleutel, 'content-type': 'application/json' };
  let antwoord: Response;
  try {
    antwoord = await doeFetch(`${basis}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: kop, body: JSON.stringify({ email: adres, password: wachtwoord }),
      signal: AbortSignal.timeout(8000), cache: 'no-store',
    });
  } catch {
    throw new InlogFout('Craftstudio-login is nu niet bereikbaar. Probeer het later opnieuw.');
  }
  if (antwoord.status === 400 || antwoord.status === 401 || antwoord.status === 422) {
    // Supabase (GoTrue) en de gateway (Kong) weigeren allebei met 4xx. Onderscheid ze, zodat een
    // verkeerde anon key niet lijkt op een fout wachtwoord. Nooit e-mail of wachtwoord loggen.
    const fout = await antwoord.json().catch(() => null) as
      { error?: string; error_code?: string; error_description?: string; msg?: string; message?: string } | null;
    const code = fout?.error_code ?? fout?.error ?? '';
    const tekst = `${fout?.error_description ?? ''} ${fout?.msg ?? ''} ${fout?.message ?? ''}`.toLowerCase();
    console.warn('[inloggen] craftstudio weigert:', antwoord.status, code || tekst.trim().slice(0, 80));
    if (code === 'email_not_confirmed' || tekst.includes('email not confirmed')) {
      throw new InlogFout('Je craftstudio-account is nog niet bevestigd. Bevestig eerst je e-mailadres.');
    }
    if (antwoord.status === 401 && !code) {
      throw new InlogFout('Inloggen met craftstudio is op de server niet goed ingesteld (sleutel geweigerd).');
    }
    return mislukt();
  }
  if (antwoord.status === 429) throw new InlogFout('Te veel inlogpogingen. Wacht even en probeer het opnieuw.');
  if (!antwoord.ok) throw new InlogFout('Craftstudio-login is nu niet bereikbaar. Probeer het later opnieuw.');
  const data = await antwoord.json().catch(() => null) as { access_token?: string; user?: { id?: string; email?: string } } | null;
  const id = data?.user?.id;
  if (!id || typeof id !== 'string') throw new InlogFout('Onverwacht antwoord van craftstudio-login.');
  pogingen.delete(adres);
  if (data.access_token) {
    await doeFetch(`${basis}/auth/v1/logout?scope=local`, {
      method: 'POST', headers: { ...kop, authorization: `Bearer ${data.access_token}` },
      signal: AbortSignal.timeout(5000), cache: 'no-store',
    }).catch(() => undefined);
  }
  return { id, email: data.user?.email ?? adres };
}
