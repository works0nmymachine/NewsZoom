# Bronnen

Welke feeds de ingest-worker ophaalt, wat ermee gebeurt en wat niet is gecontroleerd. De lijst zelf staat in [`data/feeds.json`](../data/feeds.json); de status per bron staat in de app onder **Menu → Bronnen**.

**Status (28 november 2026):** 30 feeds. Alle 30 gaven bij een proefronde in de ontwikkelomgeving een geldige RSS- of Atom-feed terug. Niet getest vanaf de Hetzner-server: daar kan een bron anders reageren (blokkade op IP of user-agent). Controleer na de eerste deploy **Menu → Bronnen**.

## Wat NewsZoom per bericht bewaart

Kop, de samenvatting die de bron zelf in de feed zet (zonder HTML, maximaal 400 tekens), link, publicatietijd, feedcategorieën en het adres van de afbeelding. Geen artikeltekst. De afbeelding wordt niet opgeslagen of doorgestuurd: de browser laadt hem bij de uitgever, zonder referrer. Berichten blijven 60 dagen in de database en 7 dagen in de app.

## Niet gecontroleerd

- Gebruiksvoorwaarden en `robots.txt` per bron. RSS is bedoeld om koppen en links over te nemen, maar dat is per uitgever niet nagelezen.
- Of de samenvatting uit de feed overal getoond mag worden. Zo nodig: per bron alleen de kop tonen (nog niet gebouwd).
- Betaalmuren: NRC, Volkskrant, Trouw, AD, Parool en De Telegraaf hebben artikelen achter een betaalmuur. De link werkt; lezen vraagt soms een abonnement.

## Feeds

| Bron | Reikwijdte | Taal | Soort | Opmerking |
| --- | --- | --- | --- | --- |
| NOS (binnenland) | Nederland | nl | journalistiek | Rubriek Wekdienst genegeerd |
| NOS Politiek, Economie, Cultuur en media, Sport | Nederland | nl | journalistiek | Onderwerp volgt uit de rubriek |
| NU.nl, NU.nl Economie, NU.nl Wetenschap | Nederland | nl | journalistiek | |
| RTL Nieuws | Nederland | nl | journalistiek | Feed bevat ook entertainment |
| De Telegraaf | Nederland | nl | journalistiek | Podcasts en horoscoop genegeerd |
| NRC | Nederland | nl | journalistiek | Puzzels genegeerd |
| de Volkskrant, Trouw, AD | Nederland | nl | journalistiek | |
| DutchNews | Nederland | en | journalistiek | Engelstalig nieuws over Nederland |
| NOS Buitenland, NOS Tech | Wereld | nl | journalistiek | |
| BBC News, Al Jazeera, DW, France 24, Euronews | Wereld | en | journalistiek | Euronews bevat veel achtergrond |
| The Kyiv Independent | Wereld | en | journalistiek | Onderwerp Oorlog en conflict |
| TechCrunch, The Verge, Ars Technica | Wereld | en | vakmedium | The Verge: aanbiedingen genegeerd |
| Nvidia Newsroom, Databricks Blog | Wereld | en | bedrijf | Getoond als mededeling |
| Het Parool (Amsterdam) | Lokaal Amsterdam | nl | journalistiek | |
| AD Amsterdam | Lokaal Amsterdam | nl | journalistiek | |

Feeds van dezelfde redactie (NOS, NU.nl, AD) delen een `uitgever`. Een kop die in twee van hun feeds staat, verschijnt één keer, en ze tellen niet als aparte bronnen bij **Ook bij**.

## Zonder werkende feed

Gecontroleerd op 28 november 2026. Deze bronnen staan wel in de voorbeeldset en onder **Bronnen in dit gebied**, met de melding dat er geen feed is.

| Bron | Wat er gebeurt |
| --- | --- |
| AT5 | `/feeds/rss` geeft 404; `/rss` en `/rss.xml` geven een HTML-pagina |
| NH Nieuws | `/rss` en `/rss.xml` geven een HTML-pagina |
| Gemeente Amsterdam | `/nieuws/rss` geeft 403 |
| Reuters, AP | Geen openbare RSS meer |
| The Guardian, Politico Europe, Tweakers | 403 vanuit de ontwikkelomgeving; vanaf de server niet geprobeerd |

## Een bron toevoegen

1. Zoek de RSS- of Atom-feed en controleer met `curl -sL <feed> | head` dat er `<rss`, `<feed` of `<rdf:RDF` in staat.
2. Voeg een regel toe aan `data/feeds.json` met `id`, `naam`, `homepage`, `feed`, `soort`, `reikwijdte`, `taal`, eventueel `gebied`, `onderwerpen`, `uitgever` en `negeer` (titelpatronen of feedcategorieën die niet worden opgeslagen).
3. Lokaal: `npm run ingest -- --once` en kijk in **Menu → Bronnen**. Achter een proxy: `NODE_USE_ENV_PROXY=1 npm run ingest -- --once`.
4. Committen en deployen. De worker neemt de lijst bij de volgende ronde over; een bron die uit de lijst verdwijnt, wordt inactief.
