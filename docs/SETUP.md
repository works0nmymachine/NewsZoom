# NewsZoom: projectopzet

Bijgewerkt 28 november 2026. **Status: live; zie [BUILD_LOG](BUILD_LOG.md).**

## Architectuur

**Vastgesteld (27 november 2026):**

- Eigen domein `newszoom.craftstudio.work` op de bestaande, gedeelde Hetzner-server.
- Opslag op die server, in de bestaande gedeelde Supabase-PostgreSQL, met een eigen beperkte rol `newszoom` en eigen schema's. De hoeveelheid data is klein.
- Gebruikers hebben een account. Inloggen gebeurt met het craftstudio-account (dezelfde e-mail en hetzelfde wachtwoord als de todo-app, via Supabase Auth). Voorkeuren en filters worden per account op de server bewaard.
- Alleen branch `main`. Een push draait geen workflow. Deployen gebeurt handmatig.
- Eén Next.js-app (`output: "standalone"`) in een Docker-container levert pagina's en API. Installeerbaar als PWA.
- Een Capacitor-app (`work.craftstudio.newszoom`) als schil die de live site laadt. Android eerst. De schil komt nadat de webapp draait.

**Gebouwd (27 november 2026):**

- De ingest-worker voert ook aangevraagde **achtergronden** uit: één tegelijk, binnen het maandbudget, met de provider uit Instellingen. Bronnen die gebruikers toevoegen haalt hij op via `scripts/veilig-ophalen.mjs` (geen interne adressen).
- Een aparte **ingest-worker** (zelfde image, ander startcommando) haalt elke 20 minuten de bronnen uit `data/feeds.json` op (RSS/Atom), slaat nieuwe en gewijzigde berichten op en houdt per bron de laatste (geslaagde) controle bij. Elke 6 uur haalt hij ook dagkoersen op (Nasdaq, CoinGecko; geen API-sleutel). De server heeft geen `pg_cron`; de worker plant zelf.
- Directe PostgreSQL-verbinding (`pg`, `DATABASE_URL`) via Docker-netwerk `supabase_default` naar `supabase-db:5432`. Geen Supabase-API, geen service-role key.
- Inhoud komt uit twee lagen: de **voorbeeldset** in `data/mvp/*.json` (echte berichten met dossiers, handmatig verzameld en in eigen woorden samengevat) en de **feeds** uit de database. Feedberichten worden nog niet automatisch aan verhalen gekoppeld; dat vraagt later een taalmodel of embeddings (`vector` staat op de server, in schema `public`).
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
| Ingest-worker | `scripts/ingest-worker.mjs`, `data/feeds.json` | Gebouwd, lokaal getest |
| Finance: watchlist, grafiek, % per bericht, marktbeeld | `/finance`, `src/lib/koersmeting.ts` | Gebouwd, getest |
| Agenda, Uitagenda, Films | `/agenda` | Gebouwd, getest |
| Android-app | `capacitor.config.ts`, `android/`, [ANDROID](ANDROID.md) | Gebouwd, nog geen APK gemaakt |
| Achtergrond op aanvraag (AI) | `scripts/achtergrond.mjs`, `scripts/llm/`, `/verhaal/[id]`, `/achtergrond/[id]` | Gebouwd; getest met nep-model, nog niet met een echte key |
| Instellingen: AI, budget, tokenteller, bronnen per doel | `/instellingen`, `src/lib/bronnen.ts`, `scripts/veilig-ophalen.mjs` | Gebouwd |

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
| `nz_instellingen` | Instellingen voor de hele app: provider, model, budget |
| `nz_llm_gebruik` | Tokenteller: één rij per aanroep van een taalmodel (tokens, zoekopdrachten, kosten) |
| `nz_achtergronden` | Automatische achtergronden met wachtrijstatus |
| `nz_watchlist`, `nz_agendakeuzes` | Watchlist en volgen/verbergen in Agenda |

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

Tests: `npm test`. Koersmomentopname vernieuwen: `node scripts/koersen-ophalen.mjs`.

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
