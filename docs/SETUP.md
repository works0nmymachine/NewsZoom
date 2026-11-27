# NewsZoom: projectopzet

Bijgewerkt 27 november 2026. **Status: app-skelet gebouwd (startpagina, healthcheck, deploy). Nog niet uitgerold.** Zie [BUILD_LOG](BUILD_LOG.md).

## Architectuur

**Vastgesteld (27 november 2026):**

- Eigen domein `newszoom.craftstudio.work` op de bestaande, gedeelde Hetzner-server.
- Opslag op die server, in de bestaande gedeelde Supabase-PostgreSQL, met een eigen beperkte rol `newszoom` en eigen schema's. De hoeveelheid data is klein.
- Gebruikers hebben een account. Inloggen gebeurt met het craftstudio-account (dezelfde e-mail en hetzelfde wachtwoord als de todo-app, via Supabase Auth). Voorkeuren en filters worden per account op de server bewaard.
- Alleen branch `main`. Een push draait geen workflow. Deployen gebeurt handmatig.
- Eén Next.js-app (`output: "standalone"`) in een Docker-container levert pagina's en API. Installeerbaar als PWA.
- Een Capacitor-app (`work.craftstudio.newszoom`) als schil die de live site laadt. Android eerst. De schil komt nadat de webapp draait.

**Voorstel:**

- Een aparte **ingest-worker** (zelfde image, ander startcommando) haalt periodiek bronnen op (RSS/Atom, API's, openbare pagina's) en houdt per bron de laatste geslaagde controle bij. De server heeft geen `pg_cron`; de worker plant zelf.
- Directe PostgreSQL-verbinding (`pg`, `DATABASE_URL`) via Docker-netwerk `supabase_default` naar `supabase-db:5432`. Geen Supabase-API, geen service-role key.
- Zoeken met `pg_trgm` (schrijfvarianten, deelwoorden zoals `haven` → `Open Havendag`). Artikelen aan verhalen koppelen kan later met `vector`. Beide extensies staan al op de server.
- Het eerste prototype ([MVP](MVP.md)) gebruikt handmatig samengestelde, gelabelde voorbeelddata als seed in de database. De ingest-worker komt pas na de MVP.

## Onderdelen

| Onderdeel | Doel | Wanneer |
| --- | --- | --- |
| App | Vandaag, Mijn Nieuws, Ontdekken, Mijn filters, Achtergrond | MVP |
| Inloggen | craftstudio-account via Supabase Auth password grant; NewsZoom bewaart alleen de gebruikers-id | MVP |
| Database | Schema `newszoom` (data) en `newszoom_jobs` (taakwachtrij) | MVP |
| Seed | Voorbeelddata, duidelijk gelabeld | MVP |
| Ingest-worker | Bronnen ophalen, ontdubbelen, laatste controle bijhouden | Na MVP |
| LLM-duiding | Briefings, afbakening van interesses, *Wat verandert dit?* | Na MVP; provider en budget open |
| Koersdata | Finance | Vervolgproef; bron open |
| Agenda-bronnen | Agenda en Uitagenda | Vervolgproef; bronnen open |

## Logisch gegevensmodel (voorstel, nog geen migraties)

| Onderdeel | Doel |
| --- | --- |
| Bron | URL, type (krant, omroep, gemeente, vakmedium), gebied, laatste geslaagde/mislukte controle |
| Artikel | Bron, URL, titel, publicatietijd, korte samenvatting; geen volledige tekst opslaan |
| Verhaal | Lopende ontwikkeling die artikelen bundelt |
| Ontwikkeling | Eén nieuw feit binnen een verhaal, met bronnen |
| Onderwerp / interesse | Zelf toegevoegd of gekozen, met afbakening |
| Gebied | Buurt, dorp, stad of streek |
| Filterregel | Meer / minder / verbergen op verhaal, onderwerp of bron, per gebruiker |
| Dossierlaag | Kort, Deze week, Afgelopen maanden, Vanaf het begin |
| Correctie | Wat is aangepast, wanneer, op basis van welke bron |
| Gebruiker | Supabase-gebruikers-id, gekozen gebieden, laatste leesmoment per verhaal |

## Lokaal ontwikkelen (zodra de code er is)

Node 22 en PostgreSQL 16 of nieuwer.

```bash
npm install
cp .env.example .env.local
npm run migrate -- "$DATABASE_URL"
npm run seed
npm run dev
```

## Bouwvolgorde (voorstel)

1. Repo-basis en serverdraaiboek (gedaan, alleen documenten).
2. Server inrichten volgens [SERVER_SETUP](SERVER_SETUP.md) en GitHub volgens [OWNER_SETUP](OWNER_SETUP.md).
3. App-skelet: Next.js, healthroute, Dockerfile, compose, deployscript, handmatige deployworkflow (gedaan). Eerste release met de startpagina om de keten te testen.
4. Inloggen met craftstudio-account.
5. MVP: Vandaag, filters, één lokaal gebied, een paar dossiers met voorbeelddata.
6. Na de proef: ingest-worker met echte bronnen.
