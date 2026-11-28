# Changelog

## [0.3.0] – 28 november 2026

Niet uitgerold. Migraties `0006_actualiteit.sql` en `0007_ai_en_bronnen.sql` draaien bij de deploy.

### Achtergrond op aanvraag
- **Achtergrond laten samenstellen** op een verhaal zonder dossier en bij elk los bericht (⋯ → Achtergrond). Een taalmodel (OpenAI of Claude) zoekt op het web en schrijft Kort, Deze week, Afgelopen maanden en Vanaf het begin, met bronnen. Gelabeld als automatisch en niet gecontroleerd; links die het model niet echt vond worden weggelaten.
- **AI en budget** (Menu): maandbudget (standaard $10), tokenteller per maand, laatste aanroepen, provider en model. Vóór elke aanroep wordt de maximale prijs gereserveerd.

### Bronnen
- **Bronnen per doel**: Nederland, Wereld, Lokaal, Finance (ook koersen), Agenda en Achtergrond, met status. Per doel een bron toevoegen: NewsZoom zoekt de feed en haalt direct de eerste berichten op; zonder feed wordt het een voorstel. Ophalen pauzeren; zelf toegevoegde bronnen verwijderen.
- Bescherming tegen SSRF bij het ophalen van door gebruikers opgegeven adressen.

### Filters
- Mijn filters per sectie: Nieuws, Eigen interesses, Finance en Agenda.
- Agendacategorieën als gekleurde chips met pictogram, ook in donkere modus, en een gekleurde rand op de kaarten.
- Vandaag zegt het als er geen filters actief zijn.

## [0.2.0] – 28 november 2026

Niet uitgerold. Deploy via de workflow **Deploy NewsZoom**; migratie `0006_actualiteit.sql` draait daarbij automatisch.

### Actualiteit
- Vandaag toont het nieuws van de afgelopen anderhalve dag. De volgorde gebruikt tijdsverval (halfwaarde 18 uur), zodat de voorbeeldset van 27 november niet meer boven vers nieuws blijft staan.
- Hetzelfde nieuws uit meerdere bronnen is één kaart met **Ook bij …**; meer bronnen tellen mee voor het belang.
- **Bijgewerkt … geleden** in de kop (oranje als het ouder is dan 40 minuten), een knop **N nieuwe berichten · Vernieuwen**, trek-om-te-verversen en verversen na 10 minuten afwezigheid.
- Label **Nieuw** voor berichten sinds je vorige bezoek. Berichten per dag gegroepeerd.

### Filteren en zoeken
- Feedberichten krijgen onderwerpen (feedcategorie of trefwoorden) en worden bij een sterke match aan lopende verhalen gekoppeld. **Waarom zie ik dit?** toont waarom.
- Meer, Minder en Verbergen zonder paginasprong, met **Ongedaan maken**. Na drie verhalen met hetzelfde onderwerp stelt NewsZoom voor dat onderwerp minder te tonen.
- Ontdekken is de zoektab: zoekbalk onderin, filters voor periode, onderwerp, bron, soort, taal en weergave. Zoeken vindt ook verborgen berichten, met een label.
- Mijn filters: onderwerpen, bronnen en verhalen direct instellen. Eerste keer: onderwerpen en gebied kiezen, of overslaan.

### Bronnen
- 30 feeds in plaats van 14, waaronder NRC, de Volkskrant, Trouw, AD, RTL Nieuws, De Telegraaf, NOS-rubrieken, DW, France 24, Euronews, The Verge, Ars Technica en AD Amsterdam. Zie [BRONNEN](docs/BRONNEN.md).
- Afbeeldingen uit de feed, RSS 1.0, puzzels en aanbiedingen genegeerd, HTML-entiteiten omgezet.
- Pagina **Bronnen** met status per feed en de laatste ophaalrondes.

### Uiterlijk en navigatie
- Rustigere kaart: titel, bron en tijd, afbeelding, en de overige acties achter ⋯.
- Eigen SVG-iconen, Menu rechtsboven (filters, bronnen, instellingen, uitloggen), zijbalk vanaf 768 px, tabs die hun laatste scherm onthouden, terugknop op detailpagina's.
- Instellingen: thema (systeem, licht, donker), lokaal gebied, account en versie.
- Laadscherm, foutpagina en 404 in het Nederlands.
- Agenda: plaats wisselt direct, lopende tentoonstellingen apart, volgen en verbergen zonder paginasprong. Finance: feednieuws per instrument en een label bij een verouderde koers.

### Kwaliteit
- `npm run browser`: browsercontrole op 360 en 1280 px voor 16 schermen, plus de stromen verbergen met Ongedaan maken en filteren.
- Tests voor onderwerpherkenning, verhaalkoppeling, bundeling, tijdsverval en spreiding.

## [0.1.0] – 27 november 2026

Eerste versie: Vandaag, Mijn Nieuws, Ontdekken met Lokaal Amsterdam, dossiers, filters, Finance, Agenda en Uitagenda, ingest-worker en Android-schil. Zie [BUILD_LOG](docs/BUILD_LOG.md).
