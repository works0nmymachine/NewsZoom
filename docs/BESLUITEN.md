# Besluiten

## Besproken uitgangspunten

- De app heet **NewsZoom**.
- Gebruikers bepalen zelf welke onderwerpen en verhalen ze volgen en welke ze willen verbergen.
- Nieuws wordt uitgelegd op meerdere tijdschalen, met de achtergrond, de betrokken partijen en de betekenis van nieuwe ontwikkelingen.
- Finance combineert koersverloop met nieuws uit dezelfde periode en maakt onderscheid tussen oudere berichtgeving en nieuwe feiten.

- Agenda toont demonstraties, treinuitval, wegwerkzaamheden, festivals, open dagen en filmreleases. Gebruikers kunnen categorieën én specifieke evenementen kiezen of verbergen.

- De Uitagenda toont wat er vandaag, deze week of deze maand te doen is in een gekozen stad of land.

- De Uitagenda maakt ook kleine theaters, buurtpodia en kroegen met liveconcerten vindbaar.

- Vandaag is het startscherm met Nederland, Wereld, persoonlijke interesses en lokaal nieuws.
- Specifieke verhaalkeuzes krijgen voorrang op bredere onderwerpvoorkeuren. De doorslaggevende regel is zichtbaar en voorkeuren blijven aanpasbaar.
- Bij lokaal nieuws zijn de aangesloten bronnen, hun laatste controle en Bron toevoegen zichtbaar.
- Dossiers tonen de bronnen bij de duiding en vermelden inhoudelijke correcties met datum en bron.
- De eerste proef focust op Vandaag, één lokaal gebied en een paar dossiers. Zie [MVP](MVP.md).

## Techniek en werkwijze (vastgesteld 27 november 2026)

- **Domein:** `newszoom.craftstudio.work`.
- **Opslag:** op de eigen Hetzner-server, in de gedeelde Supabase-PostgreSQL met een eigen rol `newszoom` en eigen schema's. Het gaat om weinig data.
- **Account:** gebruikers hebben een account en loggen in met hun craftstudio-account (zelfde login als de todo-app). Voorkeuren, filters en leeshistorie staan per account op de server.
- **Git:** alleen `main`; wijzigingen gaan direct op `main`.
- **Deployen:** alleen handmatig via de workflow Deploy NewsZoom. Een push start geen workflow, om Actions-minuten te sparen.
- **Server:** inrichting volgens het helpout-patroon, zie [SERVER_SETUP](SERVER_SETUP.md).
- **Platform:** één Next.js-webapp, installeerbaar als PWA, met een **Capacitor**-app als schil. De Capacitor-app laadt de live site (`server.url`), dus na een deploy is de app direct bijgewerkt. Pakketnaam `work.craftstudio.newszoom`, één vaste ondertekensleutel. Android eerst; iOS vraagt een Mac en een Apple Developer-account. Data loopt via API-routes en meldingen via Web Push, zodat native onderdelen later kunnen aanhaken.
- **Eerste proef (27 november 2026):** lokaal gebied **Amsterdam**; dossiers **Oekraïne**, **Israël–Gaza** en **Jensen Huang/Nvidia**. Echt nieuws, geen verzonnen voorbeelden: samenvattingen in eigen woorden met links naar de oorspronkelijke berichten. De voorbeeldset is een momentopname; de ingest-worker vult aan met actuele feedberichten.
- **Werkwijze:** alle bouwfases achter elkaar uitvoeren (27 november 2026).
- **AI-achtergrond (28 november 2026):** achtergrond op aanvraag via OpenAI (live) of Claude (Anthropic), met webzoeken. Maandbudget **$10**, te wijzigen in Instellingen. Een tokenteller boekt per aanroep tokens, zoekopdrachten en kosten, berekend met de publieke API-prijzen van 27 november 2026. Vóór elke aanroep wordt de maximale prijs gereserveerd; past die niet meer, dan start de aanroep niet. Automatische achtergronden worden gelabeld als niet gecontroleerd en tonen alleen links die het model echt vond.
- **Instellingen en bronnen (28 november 2026):** in het menu staan AI en budget (Instellingen) en Bronnen per doel (Nederland, Wereld, Lokaal, Finance, Agenda, Achtergrond), met per doel een bron toevoegen. Een toegevoegde website wordt alleen opgehaald als het een publiek adres is (bescherming tegen SSRF). AI-instellingen gelden voor de hele app; iedereen die kan inloggen kan ze wijzigen.
- **Filters per sectie (28 november 2026):** Mijn filters is opgedeeld in Nieuws, Eigen interesses, Finance en Agenda. Agendacategorieën hebben een eigen kleur en pictogram.

## UI/UX-ronde (goedgekeurd 28 november 2026)

De eigenaar keurde de verbeterlijst goed ("Bouw alles"). Gebouwd in 0.2.0, zie [CHANGELOG](../CHANGELOG.md). De keuzes hieronder zijn **voorstellen** die in de app zitten; ze blijven aanpasbaar.

- Rangschikking met tijdsverval (halfwaarde 18 uur), bundeling van hetzelfde nieuws en spreiding over redacties.
- Onderwerpen en verhaalkoppeling op vaste trefwoorden, zonder taalmodel. Bij twijfel geen koppeling.
- Afbeeldingen uit de feed direct van de uitgever (lazy, zonder referrer). Open: via de eigen server laden voor meer privacy.
- Ontdekken is de zoektab; Menu rechtsboven voor filters, bronnen, instellingen en uitloggen; zijbalk vanaf 768 px.
- Meer/Minder/Verbergen zonder paginasprong, met Ongedaan maken; zoeken toont ook verborgen berichten.
- Niet in deze ronde: pushmeldingen, offline-modus, native terugknop en delen, vertalen en AI-duiding.

## Voorstellen

- Hostpoort 8096, te bevestigen bij de serverinventaris.

- Mijn Nieuws en Ontdekken krijgen elk een eigen tabblad.
- Sinds je laatste bezoek vult de vaste tijdsvensters aan.
- Het eerste prototype gebruikt handmatig samengestelde gegevens.

## Open vragen

- Welke nieuws- en koersdatabronnen passen bij het product en welke gebruiksrechten zijn nodig?
- Hoe worden artikelen aan verhalen gekoppeld en wie controleert context en koersduiding?
- Wie houdt de dossiers bij na de momentopname? Handmatig, of later met een taalmodel en een controle vóór publicatie?
- Moeten feedberichten automatisch aan lopende verhalen worden gekoppeld met een taalmodel of embeddings? Sinds 0.2.0 gebeurt dat op trefwoorden per verhaal (`koppel`); een taalmodel blijft open.
