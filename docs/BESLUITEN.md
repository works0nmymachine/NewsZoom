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

## Voorstellen

- Hostpoort 8096, te bevestigen bij de serverinventaris.

- Mijn Nieuws en Ontdekken krijgen elk een eigen tabblad.
- Sinds je laatste bezoek vult de vaste tijdsvensters aan.
- Het eerste prototype gebruikt handmatig samengestelde gegevens.

## Open vragen

- Welke nieuws- en koersdatabronnen passen bij het product en welke gebruiksrechten zijn nodig?
- Hoe worden artikelen aan verhalen gekoppeld en wie controleert context en koersduiding?
- Welke LLM-provider en welk maandbudget voor briefings en duiding?
- Inhoud van de eerste proef: welk lokaal gebied, welke dossiers, echte of verzonnen gebeurtenissen? Zie [OWNER_SETUP](OWNER_SETUP.md).
