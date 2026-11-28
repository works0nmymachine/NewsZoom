# NewsZoom

Volg wat je boeit. Zie wat er verandert.

NewsZoom is een concept voor een persoonlijke nieuwsapp. Je kiest zelf welke onderwerpen en verhalen in je feed komen. Bij iedere update kun je uitzoomen naar de afgelopen week, de afgelopen maanden of het hele verhaal. In Finance doe je hetzelfde voor koersbewegingen en het nieuws eromheen. In Agenda zie je geplande evenementen, reisinformatie en filmreleases die bij je voorkeuren passen. Met de Uitagenda ontdek je wat er vandaag, deze week of deze maand te doen is in een stad of land.

**Status (28 november 2026):** versie 0.1 draait op https://newszoom.craftstudio.work. Versie 0.2.0 (actueel nieuws uit 30 feeds, onderwerpen en bundeling, filteren met Ongedaan maken, zoeken, nieuwe navigatie) staat op `main` en is lokaal getest, maar nog niet uitgerold. Zie [CHANGELOG](CHANGELOG.md).

## Zo ziet het eruit

![NewsZoom op een telefoon: Vandaag, verhaal, Lokaal, Finance, Uitagenda en Mijn Nieuws](docs/schermen/overzicht.png)

Losse schermen staan in [docs/schermen](docs/schermen).

## Lokaal draaien

```bash
npm install
cp .env.example .env.local
npm run migrate
npm run dev
```

Lokaal zonder craftstudio-instellingen log je in als testgebruiker. Feeds ophalen: `npm run ingest -- --once`. Tests: `npm test`. Browsercontrole tegen de draaiende dev-server: `npm run browser` (vereist Playwright met Chromium).

## Documentatie

| Document | Inhoud |
| --- | --- |
| [SETUP](docs/SETUP.md) | Architectuur, gegevensmodel en bouwvolgorde |
| [SERVER_SETUP](docs/SERVER_SETUP.md) | Draaiboek voor de Hetzner-server en Cloudflare |
| [OWNER_SETUP](docs/OWNER_SETUP.md) | Wat de eigenaar zelf instelt, met GitHub-commando's |
| [DEPLOYMENT](docs/DEPLOYMENT.md) | Handmatige releaseprocedure |
| [ANDROID](docs/ANDROID.md) | Capacitor-app en APK-workflow |
| [BUILD_LOG](docs/BUILD_LOG.md) | Uitgevoerde werkzaamheden en status |
| [CHANGELOG](CHANGELOG.md) | Wat er per versie veranderde |
| [BRONNEN](docs/BRONNEN.md) | Gevolgde feeds, wat ermee gebeurt en wat niet is gecontroleerd |
| [Functioneel ontwerp](docs/FUNCTIONEEL_ONTWERP.md) | Persoonlijke feed, verhaalpagina en context |
| [Finance](docs/FINANCE.md) | Marktbewegingen, koersen en nieuwe informatie |
| [Agenda](docs/AGENDA.md) | Evenementen, bereikbaarheid, filmreleases en persoonlijke filters |
| [MVP](docs/MVP.md) | Eerste prototype en wat we ermee willen toetsen |
| [Besluiten](docs/BESLUITEN.md) | Besproken keuzes, voorstellen en open vragen |
