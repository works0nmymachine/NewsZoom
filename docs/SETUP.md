# NewsZoom: projectopzet

Bijgewerkt 28 november 2026. **Status: 0.1 draait op de server; 0.2.0 staat op `main`, lokaal getest, nog niet uitgerold.** Zie [BUILD_LOG](BUILD_LOG.md) en [CHANGELOG](../CHANGELOG.md).

## Architectuur

**Vastgesteld (27 november 2026):**

- Eigen domein `newszoom.craftstudio.work` op de bestaande, gedeelde Hetzner-server.
- Opslag op die server, in de bestaande gedeelde Supabase-PostgreSQL, met een eigen beperkte rol `newszoom` en eigen schema's. De hoeveelheid data is klein.
- Gebruikers hebben een account. Inloggen gebeurt met het craftstudio-account (dezelfde e-mail en hetzelfde wachtwoord als de todo-app, via Supabase Auth). Voorkeuren en filters worden per account op de server bewaard.
- Alleen branch `main`. Een push draait geen workflow. Deployen gebeurt handmatig.
- Eén Next.js-app (`output: "standalone"`) in een Docker-container levert pagina's en API. Installeerbaar als PWA.
- Een Capacitor-app (`work.craftstudio.newszoom`) als schil die de live site laadt. Android eerst. De schil komt nadat de webapp draait.

**Gebouwd (27 november 2026):**

- Een aparte **ingest-worker** (zelfde image, ander startcommando) haalt elke 20 minuten de bronnen uit `data/feeds.json` op (RSS/Atom), slaat nieuwe en gewijzigde berichten op en houdt per bron de laatste (geslaagde) controle bij. Elke 6 uur haalt hij ook dagkoersen op (Nasdaq, CoinGecko; geen API-sleutel). De server heeft geen `pg_cron`; de worker plant zelf.
- Directe PostgreSQL-verbinding (`pg`, `DATABASE_URL`) via Docker-netwerk `supabase_default` naar `supabase-db:5432`. Geen Supabase-API, geen service-role key.
- Inhoud komt uit twee lagen: de **voorbeeldset** in `data/mvp/*.json` (echte berichten met dossiers, handmatig verzameld en in eigen woorden samengevat) en de **feeds** uit de database (30 bronnen, zie [BRONNEN](BRONNEN.md)). Feedberichten krijgen in de app onderwerpen (feedcategorie of trefwoorden) en worden bij een sterke match aan een lopend verhaal gekoppeld (`src/lib/herkenning.ts`). Een taalmodel of embeddings blijft een open keuze.
- Volgorde en bundeling: `src/lib/rangorde.ts` (tijdsverval, hetzelfde nieuws herkennen, spreiding) en `src/lib/selectie.ts` (van berichten naar kaarten).
- Zoeken in de Uitagenda gebruikt deelwoorden en accentloze vergelijking in de app; `pg_trgm` is nog niet nodig.

## Onderdelen

| Onderdeel | Waar | Status |
| --- | --- | --- |
| Inloggen | `src/lib/craftstudio.ts`, `src/lib/sessie.ts`, `/inloggen` | Gebouwd; craftstudio-login niet live getest |
| Vandaag, Mijn Nieuws, Ontdekken, Lokaal | `src/app/` | Gebouwd |
| Filterregels en Waarom zie ik dit? | `src/lib/filters.ts` | Gebouwd, getest |
| Verhaalpagina met achtergrondlagen, Wat verandert dit?, correcties | `src/app/verhaal/[id]` | Gebouwd |
| Eigen interesses met afbakening en voorproef | `/mijn-nieuws#interesse` | Gebouwd (zoektermen; geen taalmodel) |
| Bronnen in dit gebied en Bron toevoegen | `/ontdekken?r=lokaal` | Gebouwd |
| Ingest-worker | `scripts/ingest-worker.mjs`, `data/feeds.json` | Gebouwd, lokaal getest; 30 feeds sinds 0.2.0 |
| Onderwerpen, verhaalkoppeling, bundeling | `src/lib/herkenning.ts`, `src/lib/rangorde.ts` | Gebouwd 0.2.0, getest |
| Zoeken en filters, Bronnen, Instellingen, eerste keer | `/ontdekken`, `/bronnen`, `/instellingen`, `/start` | Gebouwd 0.2.0 |
| Finance: watchlist, grafiek, % per bericht, marktbeeld | `/finance`, `src/lib/koersmeting.ts` | Gebouwd, getest |
| Agenda, Uitagenda, Films | `/agenda` | Gebouwd, getest |
| Android-app | `capacitor.config.ts`, `android/`, [ANDROID](ANDROID.md) | Gebouwd, nog geen APK gemaakt |
| LLM-duiding | – | Open: provider en budget |

## Gegevens

| Tabel | Inhoud |
| --- | --- |
| `nz_gebruikers`, `nz_sessies` | Account (Supabase-gebruikers-id) en sessies (alleen hash van het token) |
| `nz_filterregels` | Meer / Minder / Verbergen per verhaal, onderwerp of bron |
| `nz_interesses` | Eigen interesses met zoektermen en uitsluitingen |
| `nz_leesmomenten` | Laatste bezoek per verhaal, voor Sinds je laatste bezoek |
| `nz_bronvoorstellen` | Voorgestelde bronnen (Bron toevoegen) |
| `nz_feedbronnen`, `nz_feeditems` | Gevolgde feeds, controlestatus en opgehaalde berichten (60 dagen bewaard) |
| `nz_koersen`, `nz_koersbronnen` | Dagkoersen en status van de koersbron |
| `nz_watchlist`, `nz_agendakeuzes` | Watchlist en volgen/verbergen in Agenda |
| `nz_ingest_rondes` | Logboek per ophaalronde (14 dagen bewaard), voor de pagina Bronnen |
| `nz_bezoeken` | Laatste moment van het vorige bezoek, voor het label Nieuw |
| `nz_instellingen` | Lokaal gebied en of de eerste keuze (onderwerpen) is gedaan |

Voorbeeldset: `data/mvp/*.json`, beschreven in `src/lib/inhoud-types.ts` en `src/lib/finance-agenda-types.ts`. Elk bestand is een deel; de app voegt ze samen. `src/lib/inhoud.test.ts` controleert ids, verwijzingen, links en datums.

## Lokaal ontwikkelen

Node 22 en PostgreSQL 16 of nieuwer.

```bash
npm install
cp .env.example .env.local
npm run migrate
npm run dev
```

Zonder craftstudio-instellingen toont `/inloggen` lokaal een knop **Inloggen als testgebruiker** (nooit in productie). Feeds en koersen lokaal ophalen:

```bash
npm run ingest -- --once
```

Tests: `npm test`. Browsercontrole tegen de draaiende dev-server: `npm run browser` (Playwright met Chromium vereist, niet in `package.json`). Achter een HTTP-proxy haalt Node feeds op met `NODE_USE_ENV_PROXY=1 npm run ingest -- --once`. Koersmomentopname vernieuwen: `node scripts/koersen-ophalen.mjs`.

## Bouwvolgorde

1. Repo-basis en serverdraaiboek. **Gedaan.**
2. Server inrichten volgens [SERVER_SETUP](SERVER_SETUP.md) en GitHub volgens [OWNER_SETUP](OWNER_SETUP.md). **Eigenaar, open.**
3. App-skelet met handmatige deploy. **Gedaan.**
4. Inloggen met craftstudio-account. **Gedaan.**
5. MVP: Vandaag, filters, Lokaal Amsterdam, dossiers met echte berichten. **Gedaan.**
6. Ingest-worker met echte feeds. **Gedaan.**
7. Vervolgproeven Finance en Agenda/Uitagenda. **Gedaan.**
8. Android-app (Capacitor). **Gedaan; eerste APK via de workflow.**
9. Daarna: eerste release, de proef een paar dagen gebruiken ([MVP](MVP.md)), en besluiten over LLM-duiding en automatisch koppelen van berichten aan verhalen.
