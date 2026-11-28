// Vorm van de MVP-inhoud in data/mvp/*.json. Elk bestand is een (deel van een) Inhoud; de app voegt ze samen.
// Teksten in het Nederlands, in eigen woorden. Geen artikeltekst overnemen; altijd linken naar de bron.

export type BronSoort = 'journalistiek' | 'overheid' | 'organisatie' | 'vakmedium' | 'bedrijf';

export type Bron = {
  id: string; // korte slug, bv. 'nos', 'parool', 'at5', 'reuters', 'nvidia', 'gemeente-amsterdam'
  naam: string;
  url: string; // homepage
  soort: BronSoort;
  gebied?: string; // bv. 'amsterdam' voor lokale bronnen
};

export type Link = {
  bron: string; // Bron.id
  titel: string; // kop van het artikel zoals gepubliceerd
  url: string; // directe link naar het artikel
  datum: string; // YYYY-MM-DD
};

export type Laag = {
  tekst: string; // alinea's gescheiden door een lege regel (\n\n); geen markdown behalve dat
  bronnen: Link[];
};

export type Verhaal = {
  id: string; // slug, bv. 'oorlog-oekraine'
  titel: string;
  onderwerpen: string[]; // Onderwerp.id
  reikwijdte: 'nederland' | 'wereld' | 'lokaal';
  gebied?: string; // bij lokaal: 'amsterdam'
  // Trefwoordgroepen om nieuwe feedberichten aan dit verhaal te koppelen: alle termen van één groep
  // moeten voorkomen, minstens één in de kop. Zie src/lib/herkenning.ts. Bij twijfel geen koppeling.
  koppel?: string[][];
  laatsteOntwikkeling: string; // één zin: wat is het nieuwste
  watVerandert?: {
    tekst: string; // wat veranderde, voor wie
    onzeker: string; // wat nog onzeker is
    bronnen: Link[];
  };
  partijen?: { naam: string; belang: string }[];
  dossier?: {
    kort: Laag; // 3-5 zinnen
    dezeWeek: Laag; // recente ontwikkelingen nodig om de kop te begrijpen
    afgelopenMaanden: Laag; // richting van het verhaal: wie won/verloor terrein, tempo
    vanafBegin: Laag; // aanleiding, sleutelmomenten, partijen, wat op het spel staat
  };
  correcties?: {
    datum: string; // YYYY-MM-DD
    was: string; // wat eerder werd gemeld
    wordt: string; // wat het nu is
    bron: Link; // bron van de correctie
    voorbeeld?: boolean; // true als het een illustratief voorbeeld is, geen echte correctie
  }[];
};

export type Bericht = {
  id: string; // slug, uniek over alle bestanden
  verhaal: string; // Verhaal.id
  titel: string; // kop zoals gepubliceerd
  bron: string; // Bron.id
  url: string; // directe link
  gepubliceerd: string; // ISO 8601 met tijd en zone, bv. 2026-11-26T14:05:00+01:00
  samenvatting: string; // 1-2 zinnen in eigen woorden
  nieuw: string; // één zin: wat is er nieuw ten opzichte van eerder
  soort: 'journalistiek' | 'mededeling'; // mededeling = bv. gemeente, bedrijf, overheid zelf
  belang: 1 | 2 | 3; // 3 = hoort bij de belangrijkste ontwikkelingen van de dag
};

export type Onderwerp = { id: string; naam: string };

export type Inhoud = {
  bronnen: Bron[];
  onderwerpen: Onderwerp[];
  verhalen: Verhaal[];
  berichten: Bericht[];
};
