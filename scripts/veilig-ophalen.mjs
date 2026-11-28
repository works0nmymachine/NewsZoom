// Haalt een door een gebruiker opgegeven URL op zonder het interne netwerk te bereiken (SSRF).
// Alleen http(s) op poort 80/443, elk IP-adres wordt bij het verbinden gecontroleerd (ook na DNS,
// dus geen DNS-rebinding), redirects handmatig en opnieuw gecontroleerd, met time-out en maximale grootte.
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

export class NietToegestaan extends Error {}

/** Is dit een publiek adres? Blokkeert loopback, privé, link-local, CGNAT, multicast, gereserveerd en IPv4-in-IPv6. */
export function publiekAdres(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && (b === 168 || b === 0)) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    return true;
  }
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    const v4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(x);
    if (v4) return publiekAdres(v4[1]);
    if (x === '::' || x === '::1') return false;
    if (/^f[cd]/.test(x) || /^fe[89ab]/.test(x) || /^ff/.test(x)) return false;
    if (x.startsWith('64:ff9b:') || x.startsWith('2001:db8:') || x.startsWith('::ffff:')) return false;
    return true;
  }
  return false;
}

export function controleerUrl(ruw) {
  let u;
  try { u = new URL(ruw); } catch { throw new NietToegestaan('Geen geldig webadres.'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new NietToegestaan('Alleen http:// en https:// zijn toegestaan.');
  if (u.username || u.password) throw new NietToegestaan('Webadressen met inloggegevens zijn niet toegestaan.');
  if (u.port && u.port !== '80' && u.port !== '443') throw new NietToegestaan('Alleen de standaardpoorten 80 en 443 zijn toegestaan.');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && !publiekAdres(host)) throw new NietToegestaan('Dit adres is niet publiek bereikbaar.');
  if (!net.isIP(host) && !host.includes('.')) throw new NietToegestaan('Gebruik een volledige domeinnaam.');
  return u;
}

// Lookup die alleen publieke adressen doorlaat; wordt bij elke verbinding gebruikt.
function veiligeLookup(hostname, opties, cb) {
  dns.lookup(hostname, { ...opties, all: true }, (err, adressen) => {
    if (err) return cb(err);
    const ok = adressen.filter((a) => publiekAdres(a.address));
    if (!ok.length) return cb(new NietToegestaan('Dit adres is niet publiek bereikbaar.'));
    if (opties.all) return cb(null, ok);
    return cb(null, ok[0].address, ok[0].family);
  });
}

function eenVerzoek(u, { headers, timeoutMs, maxBytes }) {
  return new Promise((resolve, reject) => {
    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.request(u, { method: 'GET', headers, lookup: veiligeLookup, timeout: timeoutMs }, (res) => {
      const kop = Object.fromEntries(Object.entries(res.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v]));
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve({ status: res.statusCode, headers: kop, redirect: res.headers.location, body: '' });
      }
      const delen = [];
      let lengte = 0;
      res.on('data', (d) => {
        lengte += d.length;
        if (lengte > maxBytes) { req.destroy(new Error('Antwoord te groot')); return; }
        delen.push(d);
      });
      res.on('end', () => resolve({ status: res.statusCode, headers: kop, body: Buffer.concat(delen).toString('utf8') }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('time-out')));
    req.on('error', reject);
    req.end();
  });
}

/** GET met maximaal 4 redirects; elke stap wordt opnieuw gecontroleerd. Geeft { status, headers, body, url }. */
export async function veiligOphalen(ruw, { headers = {}, timeoutMs = 15000, maxBytes = 5_000_000, maxRedirects = 4 } = {}) {
  let u = controleerUrl(ruw);
  for (let n = 0; n <= maxRedirects; n++) {
    const r = await eenVerzoek(u, { headers, timeoutMs, maxBytes });
    if (!r.redirect) return { ...r, url: u.toString() };
    u = controleerUrl(new URL(r.redirect, u).toString());
  }
  throw new Error('Te veel doorverwijzingen');
}

/** Zoekt in HTML naar <link rel="alternate" type="application/rss+xml|atom+xml" href="...">. */
export function vindFeedLinks(html, basis) {
  const uit = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    const attr = (naam) => (new RegExp(`\\b${naam}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag) ?? [])
      .slice(2).find((x) => x !== undefined);
    if (!/alternate/i.test(attr('rel') ?? '')) continue;
    if (!/application\/(rss|atom)\+xml/i.test(attr('type') ?? '')) continue;
    const href = attr('href');
    if (!href) continue;
    try { uit.push(new URL(href.replace(/&amp;/g, '&'), basis).toString()); } catch { /* ongeldig */ }
  }
  return [...new Set(uit)];
}

export const lijktFeed = (tekst) => /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<(rss|feed|rdf:RDF)\b/i.test(tekst);

/** Titel uit HTML of feed, voor een standaardnaam. */
export function titelUit(tekst) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(tekst);
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200) : '';
}
