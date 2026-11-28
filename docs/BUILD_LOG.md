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

## 2026-11-27: serverinrichting en eerste release

- Eigenaar heeft de server ingericht volgens SERVER_SETUP §0–§9 en de GitHub-environment `production` gezet (secrets via `ssh … | gh secret set`).
- Eerste release via de workflow Deploy NewsZoom: geslaagd volgens de eigenaar. Van buitenaf gecontroleerd: `https://newszoom.craftstudio.work/api/health` geeft `{"status":"ok","commit":"e35ded8…"}`, `/` stuurt door naar `/inloggen`, CSP en HSTS aanwezig.
- Tijdens de inrichting is het root-wachtwoord per ongeluk in een terminal en de chat beland; de eigenaar heeft het gewijzigd. Inloggen als root met een SSH-sleutel in plaats van een wachtwoord staat nog open.
- Nog niet bevestigd: inloggen met een echt craftstudio-account, ingest-logs op de server, §10 backup- en hersteltest, §11 regressiecontrole na de release.

## 2026-11-28: UI/UX-ronde 0.2.0

Op verzoek van de eigenaar is de app van alle kanten bekeken op actualiteit, filteren, navigatie, uiterlijk en bronnen, met de principes uit de andere repo's (helpout, TodoApp, boodschappenlijstje, Stek, MovieMate, Nomi, BookSearch, FlightWatch, TripForge, Huisboek). De eigenaar keurde de lijst goed ("Bouw alles"). Details: [CHANGELOG](../CHANGELOG.md).

### Wat er mis was

- Vandaag toonde op 28 november alleen berichten van 22–27 november: de voorbeeldset had belang 2–3, feedberichten altijd 1, zonder tijdsverval.
- Feedberichten hadden geen onderwerp en geen verhaal. Filteren op onderwerp en Volg dit verhaal werkten alleen op de 58 handmatige berichten.
- Hetzelfde nieuws van meerdere bronnen stond los onder elkaar. 14 feeds, waarvan landelijk alleen NOS en NU.nl.
- Elke filterklik herlaadde de pagina en sprong naar boven, zonder Ongedaan maken. Kaarten hadden vier knoppen. Uitloggen stond in elke kop.

### Gebouwd

| Onderdeel | Waar |
| --- | --- |
| Onderwerpen en verhaalkoppeling op trefwoorden | `src/lib/herkenning.ts`, `koppel` per verhaal in `data/mvp/*.json` |
| Tijdsverval, bundeling, spreiding | `src/lib/rangorde.ts`, `src/lib/selectie.ts` |
| 30 feeds, afbeeldingen, categorieën, RSS 1.0, ruisfilter, ophaallogboek | `data/feeds.json`, `scripts/feed-parser.mjs`, `scripts/ingest-worker.mjs`, migratie `0006` |
| Kaart met ⋯-paneel, Meer/Minder/Verbergen zonder paginasprong met Ongedaan maken | `src/components/bericht-kaart.tsx`, `kaart-menu.tsx`, `meldingen.tsx`, `regelWijzigen` |
| Versheid en verversen | `bijgewerkt.tsx`, `verversen.tsx`, `/api/nieuw`, `nz_bezoeken` |
| Navigatie | `nav.tsx` (SVG-iconen, tabgeheugen, zijbalk), `hoofd-menu.tsx`, `terug-knop.tsx` |
| Zoeken en filters | `/ontdekken` (zoekbalk onderin, filterpaneel) |
| Nieuwe pagina's | `/start`, `/instellingen`, `/bronnen` |
| Agenda en Finance | Lopende tentoonstellingen apart, acties zonder paginasprong; feednieuws per instrument |
| Browsercontrole | `scripts/browser-check.mjs` (`npm run browser`) |

### Eigen keuzes

- **Geen taalmodel.** Onderwerpen en koppelingen komen uit vaste trefwoorden. Bij twijfel geen koppeling (principe uit Stek en BookSearch). 29% van 682 feedberichten kreeg geen onderwerp; filters op onderwerp gelden daar niet, en het paneel zegt dat.
- **Afbeeldingen direct van de uitgever**, lazy en zonder referrer, zoals MovieMate. De eigenaar beantwoordde de vraag niet; dit is de eenvoudigste optie. Nadeel: de uitgever ziet het IP-adres van de lezer. Alternatief: via de eigen server laden (niet gebouwd).
- **Feedbelang**: 1, +0,5 bij een gekoppeld verhaal, +0,5 bij een herkend onderwerp. Berichten zonder herkenbaar onderwerp zijn vaak achtergrond of vermaak en zakken daardoor iets.
- **Bundelen** alleen bij hetzelfde adres of minstens 3 gedeelde kernwoorden (60% van de kortste kop) binnen 36 uur. Op 610 echte berichten: 34 bundels, geen foute gevonden bij handmatige controle. Engelse en Nederlandse koppen over hetzelfde nieuws worden niet gebundeld.
- **Zoeken negeert verberg-regels** en labelt die berichten (Nomi, MovieMate). Breed overzicht zit nu in het filterpaneel.
- **3× Minder-voorstel** telt verhalen met Minder of Verbergen die een onderwerp delen. Een onderwerpregel komt alleen na een tik op het voorstel.
- **Geen skeletons per kaart**, wel één laadscherm (`loading.tsx`) en bezig-staten op knoppen, in lijn met helpout.
- **Pushmeldingen, offline-modus en native Android-terugknop/delen zijn niet gebouwd.** Web Push werkt waarschijnlijk niet in de Capacitor-WebView (niet getest); native onderdelen vragen plugins en een nieuwe APK.

### Getest

- Lint, typecheck, 70 unittests (nieuw: herkenning, koppeling, bundeling, tijdsverval, spreiding, parser met afbeeldingen/RDF/entiteiten, lopende evenementen), productiebuild.
- Lokaal met PostgreSQL 16 en een echte ingestronde: alle 30 feeds gaven berichten (662 nieuw).
- `npm run browser`: 34 controles gelukt (16 schermen op 360 en 1280 px zonder foutpagina, horizontale scroll, consolefouten of naamloze knoppen; verbergen via ⋯ zonder paginasprong met Ongedaan maken; filteren met een schone adresbalk).

### Review en verfijning

Een onafhankelijke codereview op de hele wijziging vond tien punten. Allemaal opgelost:

- Een ongeldige numerieke HTML-entiteit in één feed kon alle nieuwspagina's laten falen. Nu worden alleen geldige tekens omgezet.
- Onderwerpen opnieuw kiezen kon een eerdere Meer- of Minder-keuze niet terugzetten naar Gewoon.
- Bij het voorstel na drie verhalen verdween Ongedaan maken. Een mislukte Ongedaan maken gaf geen melding.
- Ontdekken sneed de lijst op score en groepeerde daarna per dag. Meer berichten voegde daardoor kaarten middenin toe.
- Het filterformulier liet na Terug uitgeschakelde velden achter. Het navigeert nu binnen de app en sluit het paneel.
- De teller voor nieuwe berichten miste berichten direct na het verversen en telde verborgen bronnen mee.
- Klein: de herkenningscache hield verouderde koppelingen vast, het anker op de verhaalpagina ontbrak, en bij Start konden onbekende onderwerpen worden opgeslagen.

Daarna zelf gevonden en opgelost:

- Bundelen kostte 1,2 s per pagina voor 722 berichten. Nu 48 ms, omdat kernwoorden per bericht één keer worden berekend.
- De paneelinhoud van ⋯ wordt pas gemaakt bij openen. De HTML van Ontdekken ging van 478 naar 370 KB, gzip 55 KB.
- Hetzelfde bericht stond op Vandaag soms in twee secties. Elk bericht staat nu in één sectie.
- Uitgever en ruisfilter worden ook bij het tonen uit `data/feeds.json` gelezen, zodat ze gelden voor berichten van vóór de wijziging.
- Valse treffer: "Eloise van Oranje" telde als Sport.

### Niet getest

- Deploy van 0.2.0 en migratie `0006` op de server.
- De feeds vanaf de Hetzner-server. In de ontwikkelomgeving moest Node via de proxy (`NODE_USE_ENV_PROXY=1`); op de server is dat niet nodig.
- Inloggen met een echt craftstudio-account (ongewijzigd).
- De Android-app met de nieuwe UI (de schil laadt de live site, dus na een deploy is hij bijgewerkt).

### Bekende beperkingen

- De dossiers en de agenda blijven een momentopname van 27 november. Dossierteksten tonen nu hun datum; nieuwere feedberichten staan erboven als **Nieuwste berichten**.
- Engelse koppen worden niet vertaald.
- Onderwerpherkenning mist samenstellingen zoals "Iranoorlog" en kan bij figuurlijk taalgebruik verkeerd toekennen ("storm van kritiek").
