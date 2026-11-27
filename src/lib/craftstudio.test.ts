import { beforeEach, describe, expect, it, vi } from 'vitest';
import { craftstudioControle, InlogFout, wisPogingen } from './craftstudio';

const env = { CRAFTSTUDIO_AUTH_URL: 'http://kong:8000/', CRAFTSTUDIO_AUTH_KEY: 'anon' } as unknown as NodeJS.ProcessEnv;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe('craftstudioControle', () => {
  beforeEach(() => wisPogingen());

  it('geeft de gebruiker terug en trekt de Supabase-sessie in', async () => {
    const doeFetch = vi.fn()
      .mockResolvedValueOnce(json(200, { access_token: 't', user: { id: 'u1', email: 'a@b.nl' } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await craftstudioControle(' A@b.nl ', 'geheim', { env, doeFetch })).toEqual({ id: 'u1', email: 'a@b.nl' });
    expect(doeFetch.mock.calls[0][0]).toBe('http://kong:8000/auth/v1/token?grant_type=password');
    expect(doeFetch.mock.calls[1][0]).toBe('http://kong:8000/auth/v1/logout?scope=local');
  });

  it('geeft null bij een fout wachtwoord en remt na vijf pogingen', async () => {
    const doeFetch = vi.fn().mockImplementation(async () => json(400, { error: 'invalid_grant' }));
    for (let i = 0; i < 5; i++) expect(await craftstudioControle('a@b.nl', 'x', { env, doeFetch })).toBeNull();
    await expect(craftstudioControle('a@b.nl', 'x', { env, doeFetch })).rejects.toBeInstanceOf(InlogFout);
  });

  it('weigert zonder instellingen', async () => {
    await expect(craftstudioControle('a@b.nl', 'x', { env: {} as NodeJS.ProcessEnv })).rejects.toBeInstanceOf(InlogFout);
  });
});
