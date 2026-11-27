// Vorm van data/mvp/finance*.json en data/mvp/agenda*.json. Zie ook inhoud-types.ts (Bron, Link).
import type { Bron, Link } from './inhoud-types';

// ---------- Finance ----------

export type Instrument = {
  id: string; // 'nvda', 'btc'
  naam: string;
  ticker?: string; // ontbreekt bij een bedrijf zonder beursnotering
  soort: 'aandeel' | 'crypto' | 'bedrijf';
  valuta?: string;
  beurs?: string; // 'Nasdaq'
  tijdzone?: string; // 'America/New_York' voor aandelen, 'UTC' voor crypto
  benchmark?: string; // naam van een passende vergelijking, bv. 'Nasdaq-100'
};

export type Koers = { datum: string; slot: number }; // datum YYYY-MM-DD, slotkoers van die handelsdag

export type FinanceBericht = {
  id: string;
  instrument: string; // Instrument.id
  titel: string; // kop zoals gepubliceerd
  bron: string; // Bron.id
  url: string;
  gepubliceerd: string; // ISO 8601 met tijd en zone
  eerderBekend?: { tekst: string; link?: Link }; // wat de markt al wist, met eerste publicatie
  nieuw: string; // het concrete nieuwe feit
  mogelijkeInvloed: string; // waarom het verwachtingen kan veranderen
  onzekerheid: string; // wat bronnen wel/niet ondersteunen
  soort?: 'kwartaalcijfers' | 'product' | 'financiering' | 'overname' | 'beleid' | 'overig';
};

export type Rendement = { naam: string; rendement: number; bron: Link }; // rendement in procenten, bv. -1.8

export type MarktRecap = {
  periode: { van: string; tot: string }; // YYYY-MM-DD
  indices: Rendement[];
  sectoren?: Rendement[];
  bijdragers?: { naam: string; toelichting: string; bron: Link }[]; // welke bedrijven de beweging vooral verklaarden
  toelichting: string;
  bronnen: Link[];
};

export type Finance = {
  bronnen: Bron[];
  instrumenten: Instrument[];
  berichten: FinanceBericht[];
  recap?: MarktRecap;
};

// ---------- Agenda ----------

export type EvenementCategorie =
  | 'festival' | 'concert' | 'livemuziek' | 'theater' | 'expositie' | 'open-dag' | 'markt'
  | 'traditie' | 'wijkfeest' | 'film' | 'demonstratie' | 'verstoring' | 'overig';

export type Evenement = {
  id: string;
  titel: string;
  categorie: EvenementCategorie;
  start: string; // ISO 8601; alleen datum (YYYY-MM-DD) mag als de tijd onbekend is
  eind?: string;
  locatie: string; // naam van de locatie of het traject (bij verstoring)
  plaats: string; // 'Amsterdam', 'Deventer'
  wijk?: string;
  land: string; // 'Nederland'
  organisator?: string;
  beschrijving: string; // 1-2 zinnen eigen woorden
  bron: { naam: string; url: string }; // oorspronkelijke aankondiging
  gratis?: boolean;
  aanmelden?: boolean; // aanmelden verplicht
  genre?: string; // muziekgenre of festivalgenre
  locatieType?: 'kroeg' | 'cafe' | 'klein-theater' | 'podium' | 'museum' | 'buiten' | 'bedrijf' | 'overig';
  status: 'gepland' | 'gewijzigd' | 'geannuleerd' | 'actueel'; // actueel = lopende verstoring
  verstoring?: 'gepland' | 'actueel'; // alleen bij categorie verstoring
  hoofdevenement?: string; // id van het hoofdevenement
  zoektermen?: string[]; // extra termen, bv. ['Charles Dickens', 'kerstmarkt']
};

export type Film = {
  id: string;
  titel: string;
  releasedatum: string; // YYYY-MM-DD, Nederlandse bioscooprelease
  genre: string;
  bron: { naam: string; url: string };
};

export type Agenda = {
  evenementen: Evenement[];
  films: Film[];
};
