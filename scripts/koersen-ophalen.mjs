// Haalt dagelijkse slotkoersen op en schrijft data/mvp/koersen.json (of naar de database via de worker).
// Bronnen zonder API-sleutel: Nasdaq (aandelen, indices) en CoinGecko (crypto).
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const UA = { 'user-agent': 'Mozilla/5.0 (compatible; NewsZoom/0.1)', accept: 'application/json' };
const iso = (d) => d.toISOString().slice(0, 10);

export async function nasdaq(symbool, assetclass, dagen = 200) {
  const tot = new Date();
  const van = new Date(tot.getTime() - dagen * 86400000);
  const url = `https://api.nasdaq.com/api/quote/${symbool}/historical?assetclass=${assetclass}&fromdate=${iso(van)}&todate=${iso(tot)}&limit=9999`;
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`Nasdaq ${symbool}: HTTP ${r.status}`);
  const rows = (await r.json())?.data?.tradesTable?.rows ?? [];
  return rows.map((x) => {
    const [m, d, j] = x.date.split('/');
    return { datum: `${j}-${m}-${d}`, slot: Number(String(x.close).replace(/[$,]/g, '')) };
  }).filter((k) => Number.isFinite(k.slot)).sort((a, b) => a.datum.localeCompare(b.datum));
}

export async function coingecko(id, dagen = 200) {
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${dagen}&interval=daily`;
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`CoinGecko ${id}: HTTP ${r.status}`);
  const per = new Map();
  for (const [ms, prijs] of (await r.json()).prices ?? []) per.set(iso(new Date(ms)), Math.round(prijs * 100) / 100);
  // CoinGecko geeft per dag de koers om 00:00 UTC; dat is de "slot" van de vorige dag. Laatste punt = nu.
  return [...per].map(([datum, slot]) => ({ datum, slot })).sort((a, b) => a.datum.localeCompare(b.datum));
}

export const REEKSEN = [
  { id: 'nvda', bron: 'Nasdaq', haal: () => nasdaq('NVDA', 'stocks') },
  { id: 'ndx', bron: 'Nasdaq', haal: () => nasdaq('NDX', 'index') },
  { id: 'btc', bron: 'CoinGecko', haal: () => coingecko('bitcoin') },
];

export async function haalAlles() {
  const uit = { opgehaald: new Date().toISOString(), reeksen: {} };
  for (const r of REEKSEN) {
    try {
      uit.reeksen[r.id] = { bron: r.bron, koersen: await r.haal() };
    } catch (e) {
      uit.reeksen[r.id] = { bron: r.bron, fout: String(e.message ?? e), koersen: [] };
    }
  }
  return uit;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const uit = await haalAlles();
  const doel = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'data', 'mvp', 'koersen.json');
  await writeFile(doel, JSON.stringify(uit, null, 1) + '\n');
  for (const [id, r] of Object.entries(uit.reeksen)) console.log(id, r.koersen.length, r.koersen.at(-1), r.fout ?? '');
}
