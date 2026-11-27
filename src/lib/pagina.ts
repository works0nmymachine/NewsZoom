import 'server-only';
import { inhoudMetFeeds } from './feeds';
import { regelsVan } from './regels';
import { vereisGebruiker } from './sessie';

/** Wat bijna elke pagina nodig heeft: ingelogde gebruiker, diens regels en de inhoud. */
export async function paginaContext() {
  const gebruiker = await vereisGebruiker();
  const [regels, inhoud] = await Promise.all([regelsVan(gebruiker.id), inhoudMetFeeds()]);
  return { gebruiker, regels, inhoud };
}
