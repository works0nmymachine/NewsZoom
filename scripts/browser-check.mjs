// Browsercontrole tegen een draaiende lokale ontwikkelserver (npm run dev, zonder craftstudio-instellingen,
// zodat de testlogin beschikbaar is). Controleert per scherm op 360 en 1280 px: geen foutpagina, geen
// horizontale scroll, geen consolefouten, knoppen met een naam. Daarna twee stromen: verbergen via ⋯
// zonder paginasprong (met Ongedaan maken) en filteren in Ontdekken. Schermafbeeldingen in test-artifacts/.
// Gebruik: APP_URL=http://localhost:3000 node scripts/browser-check.mjs
// Vereist het pakket playwright met Chromium (bijvoorbeeld globaal geïnstalleerd); het staat bewust niet
// in package.json, zodat de Docker-build geen browser downloadt.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const basis = process.env.APP_URL ?? 'http://localhost:3000';
const map = process.env.NZ_BROWSER_ARTIFACTS ?? 'test-artifacts';
const SCHERMEN = ['/', '/mijn-nieuws', '/ontdekken', '/ontdekken?r=wereld', '/ontdekken?r=lokaal', '/ontdekken?q=amsterdam',
  '/verhaal/oorlog-oekraine', '/filters', '/bronnen', '/instellingen', '/start', '/finance', '/finance/nvda', '/agenda',
  '/agenda/uit', '/agenda/films'];
const BREEDTES = [{ naam: 'telefoon', width: 360, height: 780 }, { naam: 'desktop', width: 1280, height: 860 }];

await mkdir(map, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const fouten = [];
let gelukt = 0;

async function inloggen(context) {
  const page = await context.newPage();
  await page.goto(`${basis}/inloggen`);
  await page.getByRole('button', { name: 'Inloggen als testgebruiker' }).click({ timeout: 20000 });
  await page.waitForURL(`${basis}/`, { timeout: 30000 });
  return page;
}

try {
  for (const b of BREEDTES) {
    const context = await browser.newContext({ viewport: { width: b.width, height: b.height }, locale: 'nl-NL' });
    const page = await inloggen(context);
    const console_ = [];
    page.on('console', (m) => { if (m.type() === 'error') console_.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => console_.push(`pageerror: ${e.message.slice(0, 200)}`));
    for (const pad of SCHERMEN) {
      console_.length = 0;
      const r = await page.goto(basis + pad, { waitUntil: 'networkidle' });
      const naam = `${b.naam}${pad.replace(/[^a-z0-9]+/gi, '-')}`;
      const status = r?.status() ?? 0;
      const kop = await page.locator('h1').first().innerText().catch(() => '');
      const overloop = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      const naamloos = await page.evaluate(() => [...document.querySelectorAll('button, a[href]')]
        .filter((el) => el.offsetParent !== null && !(el.getAttribute('aria-label') || el.textContent?.trim() || el.querySelector('img[alt]:not([alt=""])')))
        .map((el) => el.outerHTML.slice(0, 80)));
      await page.screenshot({ path: `${map}/${naam}.png`, fullPage: true });
      const problemen = [
        status >= 400 && `status ${status}`,
        /Er ging iets mis|Niet gevonden/.test(kop) && `foutpagina: ${kop}`,
        overloop && 'horizontale scroll',
        naamloos.length && `knoppen zonder naam: ${naamloos.join(' ')}`,
        console_.length && `console: ${console_.join(' | ')}`,
      ].filter(Boolean);
      if (problemen.length) fouten.push(`${b.naam} ${pad}: ${problemen.join('; ')}`);
      else gelukt++;
    }

    if (b.naam === 'telefoon') {
      // Verbergen via ⋯: de pagina springt niet naar boven en Ongedaan maken zet het terug.
      await page.goto(`${basis}/ontdekken?r=alles`, { waitUntil: 'networkidle' });
      await page.evaluate(() => window.scrollTo(0, 1200));
      await page.waitForTimeout(300);
      const knoppen = page.locator('.kaart button[aria-haspopup="dialog"]');
      let gekozen = null;
      for (let i = 0; i < await knoppen.count(); i++) {
        const box = await knoppen.nth(i).boundingBox();
        if (box && box.y > 80 && box.y < b.height - 200) { gekozen = knoppen.nth(i); break; }
      }
      assert.ok(gekozen, 'geen ⋯-knop in beeld');
      await gekozen.click();
      const paneel = page.locator('dialog[open]');
      await paneel.waitFor();
      await paneel.locator('.regelrij').last().getByRole('button', { name: 'Verbergen' }).click();
      await page.locator('.toast').filter({ hasText: 'Ongedaan maken' }).waitFor({ timeout: 10000 });
      await page.keyboard.press('Escape');
      const scroll = await page.evaluate(() => window.scrollY);
      assert.ok(scroll > 400, `pagina sprong naar boven (scrollY ${scroll})`);
      await page.locator('.toast-knop').click();
      await page.locator('.toast').filter({ hasText: 'Teruggezet' }).waitFor({ timeout: 10000 });
      gelukt++;

      // Filteren: onderwerp en periode kiezen geeft een schone adresbalk en resultaten.
      await page.goto(`${basis}/ontdekken`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Filters' }).click();
      await page.locator('dialog[open] label.keuze', { hasText: 'Week' }).click();
      await page.locator('dialog[open] label.keuze', { hasText: 'Economie' }).click();
      await page.getByRole('button', { name: 'Toon resultaten' }).click();
      await page.waitForURL(/o=economie/);
      assert.ok(!/bron=&|soort=&|taal=&/.test(page.url()), `lege filters in de adresbalk: ${page.url()}`);
      assert.match(await page.locator('main h2').first().innerText(), /resultaat|resultaten/);
      gelukt++;
    }
    await context.close();
  }
} catch (e) {
  fouten.push(`stroom mislukt: ${e.message}`);
} finally {
  await browser.close();
}

console.log(`${gelukt} controles gelukt, ${fouten.length} mislukt. Schermafbeeldingen in ${map}/.`);
for (const f of fouten) console.log(`- ${f}`);
process.exit(fouten.length ? 1 : 0);
