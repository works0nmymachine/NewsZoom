# Agenda

In Agenda ziet de gebruiker wat er binnenkort gebeurt en welke actuele verstoringen vandaag relevant zijn. Denk aan demonstraties, treinuitval, wegwerkzaamheden, festivals, open dagen en films die uitkomen.

## Weergave

**Voorstel:** gebruik een chronologische lijst met Vandaag, Deze week en Later. Toon per item datum, locatie of traject, status, bron en tijdstip van de laatste update. Maak bij treinuitval onderscheid tussen geplande werkzaamheden en een actuele verstoring. Toon een gewijzigde datum, route of annulering bij het oorspronkelijke item.

## Uitagenda

De Uitagenda helpt je iets te vinden om te doen in een gekozen stad of land. Kies **Vandaag**, **Deze week** of **Deze maand** en blader door bijvoorbeeld festivals, open dagen, concerten, exposities en films. Ook een andere stad of een ander land is handmatig te kiezen.

**Voorstel:** geef de Uitagenda een eigen weergave binnen Agenda. Demonstraties en reisverstoringen blijven zichtbaar in het algemene agendaoverzicht wanneer de voorkeuren daarop aansluiten. Gebruik in de Uitagenda dezelfde categorie- en itemfilters. Toon bij filmreleases de releasedatum voor het gekozen land en eventuele lokale voorstellingen als afzonderlijke vermeldingen.

## Open dagen en lokale feestweken

- **Open dagen en bedrijfsbezoeken.** Denk aan fabrieksrondleidingen, open dagen bij bedrijven en organisaties en een kijkje achter de schermen. Toon waar bekend de locatie, tijden en of aanmelden verplicht is.
- **Wijk- en stadsfeesten.** Neem lokale feestweken en buurtfeesten op. Een meerdaagse feestweek krijgt één overzicht met de begin- en einddatum. Als er een programma beschikbaar is, staan de losse activiteiten bij de juiste dag.

Gebruik ook de eigen agenda's van bedrijven, organisaties, wijkverenigingen en feestcomités als bron. Laat de gebruiker filteren op plaats of wijk en type activiteit, en een specifieke open dag of feestweek volgen of verbergen.

## Kleine podia en livemuziek

De Uitagenda moet ook voorstellingen in kleine theaters en optredens in kroegen, cafés en buurtpodia kunnen vinden. Neem bijvoorbeeld jamsessies, open mics en gratis optredens mee. Ook een optreden dat alleen op de eigen agenda van een café staat, moet vindbaar kunnen zijn.

**Voorstel:** gebruik naast stadsagenda's ook de eigen agenda's en openbare aankondigingen van lokale podia, organisatoren en cafés. Link per optreden naar de oorspronkelijke aankondiging en vermeld wanneer die voor het laatst is gecontroleerd. Maak zichtbaar welke plaatsen en podia worden gevolgd, zodat de gebruiker de dekking kan inschatten.

Filter op type locatie, muziekgenre, gratis toegang of een specifiek podium. Je kunt bijvoorbeeld een jazzcafé volgen en een ander podium verbergen.

## Persoonlijke filters

- Kies regio's, plaatsen en relevante treintrajecten of wegen.
- Zet categorieën aan of uit en filter binnen een categorie, bijvoorbeeld op festivalgenre, locatie of organisator.
- Volg of verberg een specifiek evenement. **Voorgestelde regel:** specifieke keuzes gaan voor categorievoorkeuren. Je kunt een festival volgen terwijl de categorie Festivals uitstaat, of een festival verbergen terwijl die categorie aanstaat.
- Maak voorkeuren zichtbaar en aanpasbaar. **Voorstel:** laat de gebruiker kiezen of een voorkeur voor één editie geldt of ook voor toekomstige edities.

## Films die uitkomen

Toon aankomende filmreleases onder Films. **Voorstel:** begin met Nederlandse bioscoopreleases en toon titel, releasedatum, genre en bron. De landelijke releasedatum en een lokale voorstelling krijgen afzonderlijke labels. Laat de gebruiker filteren op genre en specifieke titels volgen of verbergen. Streamingreleases kunnen later als aparte optie worden toegevoegd.

## Opslag en nieuwe zoekrondes

NewsZoom bewaart gevonden podia, theaters, kroegen en evenementen blijvend in een database op de eigen Hetzner-server. De Uitagenda leest uit die database. Een eenmaal gevonden evenement blijft beschikbaar zonder dat een zoekopdracht het opnieuw hoeft te vinden. Na afloop verdwijnt het uit de aankomende agenda en blijft het bewaard.

Bij een volgende zoekronde:

1. Controleer of de bron, locatie of het evenement al bekend is. Gebruik voor evenementen bij voorkeur een vaste bron-ID of URL, met titel, locatie en aanvang als aanvullende kenmerken om vermeldingen uit verschillende bronnen te koppelen.
2. Sla ongewijzigde duplicaten over en ga door naar andere evenementen of bronnen. Bewaar per bron waar de vorige zoekronde eindigde als de bron dat ondersteunt.
3. Werk bij een nieuwe datum, locatie of annulering het bestaande item bij zodra de bron die wijziging meldt. Bewaar verschillende speeldata en festivaledities als afzonderlijke items.
4. Gebruik bekende locaties als vaste bronnen voor nieuwe programma-items. Nieuwe zoekrondes kunnen zich richten op locaties en evenementen die nog ontbreken.

## Open vragen

Welke bronnen leveren betrouwbare evenementendata, actuele verkeersinformatie en filmreleasekalenders? Hoe actueel moeten verstoringen zijn?
