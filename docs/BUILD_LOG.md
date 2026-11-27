# Build log

## 2026-11-27: repo-basis en serverdraaiboek

- helpout en todoist-lite bekeken als voorbeeld voor server, GitHub en docs.
- Toegevoegd: `AGENTS.md`, `CLAUDE.md`, `.gitignore`, `.env.example`, [SETUP](SETUP.md), [SERVER_SETUP](SERVER_SETUP.md), [OWNER_SETUP](OWNER_SETUP.md), [DEPLOYMENT](DEPLOYMENT.md).
- Besluiten vastgelegd: domein, opslag op de gedeelde server, account via craftstudio-login, alleen `main`, handmatig deployen zonder workflow bij push.

### Status

Alleen documentatie. Geen code, database, workflow, serverwijziging of deployment. Het draaiboek is niet op de server getest; de serverwaarden komen uit de helpout-inventaris van 17 november 2026 en moeten opnieuw gemeten worden (SERVER_SETUP §0).

### Volgende stap

Eigenaar: server, Cloudflare en GitHub inrichten volgens OWNER_SETUP, en de inhoud voor de eerste proef kiezen. Claude: app-skelet met healthroute, Dockerfile en handmatige deployworkflow.

## 2026-11-27: Capacitor en app-skelet

- Besluit: Capacitor-app als schil die de live site laadt (`work.craftstudio.newszoom`); de schil komt later.
- App-skelet: Next.js 16.4.6 standalone, startpagina "in aanbouw", PWA-manifest en iconen, CSP met nonce, `/api/health`, migratiescript.
- Deploy: `Dockerfile`, `deploy/docker-compose.yml`, `scripts/deploy.sh` en workflow **Deploy NewsZoom** (alleen `workflow_dispatch`).

### Getest

Lokaal met PostgreSQL 16: migratie, lint, typecheck, build. De standalone server geeft `/api/health` → `{"status":"ok","commit":…}`, CSP-header aanwezig, manifest en iconen bereikbaar, geen browserfouten op mobiel formaat.

### Niet getest

`docker build` (geen Docker in de ontwikkelomgeving), de workflow en `deploy.sh` op de server. Dat gebeurt bij de eerste release, na de serverinrichting.

## 2026-11-27: alle bouwfases

Op verzoek van de eigenaar zijn alle fases achter elkaar uitgevoerd.

| Fase | Resultaat |
| --- | --- |
| Inhoud | Echte berichten en dossiers voor Oekraïne, Israël–Gaza, Jensen Huang/Nvidia, Vandaag (NL en Wereld), Amsterdam (7 verhalen, dossier over de OLVG-spoedzorg), Finance en Agenda, verzameld met webzoekopdrachten. Samenvattingen in eigen woorden, met links. |
| Inloggen | craftstudio-account via Supabase password grant; eigen sessies (alleen tokenhash in de database); lokale testlogin alleen buiten productie. |
| MVP | Vandaag, Mijn Nieuws, Ontdekken (Nederland, Wereld, Lokaal: Amsterdam met Noord, Nieuw-West en Weesp, inclusief melding bij beperkte dekking), verhaalpagina met vier achtergrondlagen en Sinds je laatste bezoek, Wat verandert dit?, correcties, Mijn filters, Waarom zie ik dit?, Breed overzicht, eigen interesses met voorproef, Bronnen in dit gebied en Bron toevoegen. |
| Ingest | `scripts/ingest-worker.mjs`: 14 feeds (NOS, NU.nl, Parool, BBC, Al Jazeera, Kyiv Independent, TechCrunch, Nvidia, Databricks e.a.), conditionele requests, ontdubbelen, bijwerken bij wijziging, bronstatus, koersen. AT5 (404) en gemeente Amsterdam (403) hebben geen werkende feed en tonen een mislukte controle. |
| Finance | Watchlist, koersgrafiek met nieuwsmarkeringen, koerswijziging per bericht (1/5 handelsdagen, 24 uur/7 dagen), benchmark Nasdaq-100, Wat wist de markt al?, marktbeeld. Echte koersen van Nasdaq en CoinGecko. |
| Agenda | Vandaag/Deze week/Later met verstoringen (gepland of actueel), categorieën aan/uit, evenement en podium volgen/verbergen (specifiek gaat voor categorie), Uitagenda per stad of land met periode, deelwoordzoeken en filters, Films. |
| Android | Capacitor-project (`work.craftstudio.newszoom`) dat de live site laadt, eigen iconen, handmatige APK-workflow met ondertekening via secrets. |

### Getest

- 38+ unittests: filterregels, interesses, feedparser, koersmeting (inclusief beursuren, openingssprong, weekend, crypto), agenda (periodes, zoeken, voorrang), craftstudio-login met nep-fetch, en een controle van de hele voorbeeldset.
- Productiebuild als standalone server met PostgreSQL 16: alle 14 pagina's geven 200 zonder horizontale scroll op telefoonformaat en zonder consolefouten (CSP actief). Doorlopen: verhaal volgen, onderwerp verbergen (verhaal blijft zichtbaar), Breed overzicht, Mijn filters, Waarom zie ik dit?, bron voorstellen, interesse met voorproef, watchlist, evenement volgen.
- Ingest-worker lokaal tegen echte feeds, en apart met alleen zijn eigen dependencies (zoals in de container).
- Nvidia-feiten in de voorbeeldset (vertrek en terugkeer van Huang) nagelopen via TechCrunch, Al Jazeera en AP; de koersdata bevestigen +31,5% op 23 november.

### Niet getest

- `docker build`, de deployworkflow en `deploy.sh` op de server (geen Docker en geen SSH in de ontwikkelomgeving).
- Inloggen met een echt craftstudio-account.
- De APK-build (geen Android SDK lokaal).

### Bekende beperkingen

- De voorbeeldset is een momentopname van 27 november 2026. Feedberichten worden niet automatisch aan verhalen gekoppeld en hebben geen eigen achtergrond.
- Amsterdam: Parool-artikelen zijn alleen op kop en RSS-gegevens samengevat; de correctie in het OLVG-dossier is een gelabeld voorbeeld (geen echte correctie gevonden). De correcties bij Oekraïne, Israël–Gaza en Nvidia zijn echt.
- Bronnen in de voorbeeldset: niet alle grote titels waren doorzoekbaar (o.a. Reuters, NRC, Volkskrant). Waar alleen een datum bekend was, staat 12:00 als tijd.
- Marktbeeld: de cijfers komen uit de bronnen; de bijdrage per bedrijf aan de index is niet berekend.
