// Onderwerpen en verhalen herkennen in feedberichten met vaste trefwoorden. Geen taalmodel.
// Regels: een term met een hoofdletter telt hoofdlettergevoelig; korte afkortingen en termen met $
// tellen alleen als heel woord; andere termen matchen aan het begin van een woord (ziekenhuis →
// ziekenhuisopname). Accenten tellen niet mee (Oekraïne = Oekraine). Bij twijfel: niet toekennen.

export type Reikwijdte = 'nederland' | 'wereld' | 'lokaal';
export type Herkomst = { id: string; via: 'bron' | 'categorie' | 'trefwoord' | 'verhaal'; term?: string };

type OnderwerpDef = { id: string; naam: string; termen: string[]; categorie?: string[]; alleen?: Reikwijdte[] };

export const ONDERWERPEN: OnderwerpDef[] = [
  {
    id: 'binnenland-politiek', naam: 'Binnenlandse politiek', alleen: ['nederland', 'lokaal'],
    categorie: ['politiek'],
    termen: ['Tweede Kamer', 'Eerste Kamer', 'kamerlid', 'kamerleden', 'kamervragen', 'kabinet', 'coalitie', 'formatie', 'formateur',
      'informateur', 'staatssecretaris', 'minister$', 'ministers$', 'ministerie', 'premier$', 'partijcongres', 'partijleider', 'lijsttrekker',
      'Binnenhof', 'VVD', 'PVV', 'D66', 'CDA', 'GroenLinks', 'PvdA', 'BBB', 'JA21', 'NSC', 'SGP', 'ChristenUnie', 'Partij voor de Dieren',
      'Wilders', 'Yesilgoz', 'Jetten', 'Timmermans', 'Omtzigt', 'motie$', 'Prinsjesdag', 'Kamerdebat'],
  },
  {
    id: 'gemeentepolitiek', naam: 'Gemeentepolitiek', alleen: ['nederland', 'lokaal'],
    termen: ['gemeenteraad', 'wethouder', 'burgemeester', 'raadslid', 'raadsleden', 'stadsdeel', 'gemeentebestuur', 'Halsema', 'college van B en W'],
  },
  {
    id: 'internationale-politiek', naam: 'Internationale politiek',
    termen: ['EU', 'Europese Unie', 'Europese Commissie', 'Europees Parlement', 'European Union', 'European Commission', 'NAVO', 'NATO',
      'VN', 'Verenigde Naties', 'United Nations', 'Kremlin', 'Witte Huis', 'White House', 'Trump', 'Poetin', 'Putin', 'Zelensky', 'Zelenski',
      'Macron', 'Merz', 'Starmer', 'Xi Jinping', 'Erdogan', 'Netanyahu', 'G20', 'G7', 'president', 'presidential', 'prime minister',
      'foreign minister', 'buitenlandse zaken', 'ambassade', 'ambassador', 'embassy', 'diplomat', 'sancties', 'sanctie$', 'sanctions',
      'summit', 'election', 'parliament'],
  },
  {
    id: 'oorlog-en-conflict', naam: 'Oorlog en conflict', categorie: ['oorlog', 'conflict', 'war$'],
    termen: ['oorlog', 'war$', 'wars$', 'leger$', 'army', 'militair', 'military', 'troepen', 'troops', 'luchtaanval', 'airstrike',
      'bombardement', 'bombing', 'raket', 'missile', 'drone', 'frontlinie', 'front line', 'frontline', 'gevechten', 'fighting', 'offensief',
      'offensive', 'wapenstilstand', 'ceasefire', 'gijzelaar', 'hostage', 'Oekraine', 'Ukraine', 'Gaza', 'Hamas', 'Hezbollah',
      'IDF', 'Soedan', 'Sudan', 'Jemen', 'Yemen', 'Houthi', 'militie', 'militia', 'rebellen', 'rebels', 'invasie', 'invasion'],
  },
  {
    id: 'veiligheid', naam: 'Veiligheid',
    termen: ['politie', 'police', 'misdaad', 'crime', 'criminaliteit', 'criminele', 'crimineel', 'moord', 'murder', 'doodgeschoten',
      'steekpartij', 'schietpartij', 'shooting', 'explosie', 'explosion', 'aanslag', 'terreur', 'terror', 'brandweer', 'overval',
      'inbraak', 'aangehouden', 'arrestatie', 'gearresteerd', 'arrested', 'verdachte', 'suspect', 'defensie', 'defence', 'defense',
      'cyberaanval', 'cyberattack', 'hackers', 'hack$', 'gehackt', 'sabotage', 'spionage', 'espionage', 'spion$', 'NCTV', 'AIVD', 'MIVD',
      'ongeluk', 'ongeval', 'accident', 'nl:brand$', 'nl:branden$', 'nl:brandstichting', 'neergestort', 'crash$', 'drugs', 'witwassen'],
  },
  {
    id: 'rechtspraak', naam: 'Rechtspraak',
    termen: ['rechter', 'rechtbank', 'court$', 'rechtszaak', 'lawsuit', 'OM', 'Openbaar Ministerie', 'officier van justitie', 'celstraf',
      'gevangenisstraf', 'levenslang', 'veroordeeld', 'veroordeling', 'convicted', 'vrijgesproken', 'acquitted', 'hoger beroep', 'Hoge Raad',
      'Supreme Court', 'advocaat', 'strafzaak', 'vonnis', 'verdict', 'eist$', 'aanklacht', 'aangeklaagd', 'indicted', 'tribunaal', 'tribunal'],
  },
  {
    id: 'economie', naam: 'Economie', categorie: ['economie', 'business', 'financ', 'geld', 'markets', 'beurs'],
    termen: ['economie', 'economy', 'economisch', 'economic', 'inflatie', 'inflation', 'rente$', 'renteverhoging', 'interest rate', 'ECB',
      'Federal Reserve', 'Fed$', 'beurs', 'stock market', 'aandeel', 'aandelen', 'shares', 'AEX', 'Nasdaq', 'Dow Jones', 'S&P',
      'omzet', 'kwartaalcijfers', 'profit', 'revenue', 'ontslagen', 'layoffs', 'faillissement', 'failliet', 'bankrupt',
      'werkloosheid', 'unemployment', 'begroting', 'budget', 'belasting', 'tax$', 'taxes', 'heffing', 'importheffing', 'tarief', 'tariff',
      'handelsoorlog', 'trade war', 'export', 'overname', 'acquisition', 'merger', 'CPB', 'DNB', 'pensioen', 'cao', 'staking', 'loon$',
      'lonen$', 'koopkracht', 'consument', 'bitcoin', 'crypto'],
  },
  {
    id: 'techniek', naam: 'Techniek', categorie: ['tech', 'technology', 'gadgets', 'AI', 'science & technology'],
    termen: ['AI', 'kunstmatige intelligentie', 'artificial intelligence', 'chatbot', 'ChatGPT', 'OpenAI', 'Anthropic', 'Gemini', 'Google',
      'Apple$', 'Microsoft', 'Meta$', 'Nvidia', 'ASML', 'chip$', 'chips$', 'chipmachine', 'halfgeleider', 'semiconductor', 'software',
      'app$', 'apps$', 'smartphone', 'iPhone', 'Android', 'internet', 'datacenter', 'data center', 'robot', 'Tesla', 'SpaceX', 'Starlink',
      'algoritme', 'algorithm', 'startup', 'quantum', 'Databricks', 'TikTok', 'Musk'],
  },
  {
    id: 'wetenschap', naam: 'Wetenschap', categorie: ['wetenschap', 'science'],
    termen: ['wetenschap', 'wetenschappers', 'scientists', 'science', 'universiteit', 'university', 'NASA', 'ESA', 'ruimtevaart',
      'astronom', 'archeolog', 'fossiel', 'fossil', 'dinosaur', 'evolutie', 'DNA', 'telescoop', 'telescope', 'planeet', 'planet'],
  },
  {
    id: 'zorg', naam: 'Zorg', categorie: ['gezondheid', 'health', 'zorg'],
    termen: ['ziekenhuis', 'hospital', 'zorg$', 'gezondheidszorg', 'healthcare', 'patient', 'huisarts', 'artsen', 'nl:arts$', 'doctor', 'intensive care', 'Erasmus MC', 'UMC', 'AMC', 'LUMC', 'OLVG',
      'verpleegkundig', 'nurse', 'GGD', 'RIVM', 'corona', 'covid', 'griep', 'vaccin', 'vaccine', 'medicijn', 'medicine', 'kanker',
      'cancer', 'ziekte', 'disease', 'epidemie', 'pandemie', 'outbreak', 'uitbraak', 'zorgverzekeraar', 'eigen risico', 'ggz', 'mental health',
      'WHO', 'spoedeisende hulp', 'SEH'],
  },
  {
    id: 'wonen', naam: 'Wonen',
    termen: ['woning', 'housing', 'huurwoning', 'huurder', 'huurprijs', 'huurverhoging', 'koopwoning', 'huizenprijs', 'house prices',
      'hypotheek', 'mortgage', 'woningnood', 'woningmarkt', 'woningbouw', 'nieuwbouw', 'woningcorporatie', 'corporatie', 'dakloos',
      'homeless', 'azc', 'asielopvang', 'studentenwoning'],
  },
  {
    id: 'verkeer', naam: 'Verkeer', categorie: ['verkeer', 'traffic'],
    termen: ['verkeer', 'traffic', 'file$', 'snelweg', 'trein', 'treinen', 'NS', 'ProRail', 'spoor$', 'spoorweg', 'treinstoring',
      'wegwerkzaamheden', 'afsluiting', 'Schiphol', 'vliegveld', 'airport', 'vlucht$', 'vluchten$', 'flight$', 'flights$',
      'KLM', 'luchtvaart', 'aviation', 'openbaar vervoer', 'OV', 'tram$', 'metro$', 'bus$', 'fietser', 'cyclist', 'auto$', "auto's",
      'verkeersongeluk', 'rijbewijs', 'roltrap', 'A10', 'A1', 'A2', 'A4'],
  },
  {
    id: 'klimaat', naam: 'Klimaat en weer', categorie: ['weer', 'klimaat', 'climate', 'weather', 'environment'],
    termen: ['klimaat', 'climate', 'weer$', 'weerbericht', 'weather', 'KNMI', 'storm', 'orkaan', 'hurricane', 'overstroming', 'flood',
      'hittegolf', 'heatwave', 'droogte', 'drought', 'sneeuw', 'snow', 'ijzel', 'vorst$', 'kou$', 'kouderecord', 'temperatuur',
      'temperature', 'CO2', 'uitstoot', 'emissions', 'stikstof', 'duurzaam', 'zonnepanelen', 'windmolen', 'windpark', 'bosbrand',
      'wildfire', 'aardbeving', 'earthquake', 'natuurijs'],
  },
  {
    id: 'cultuur', naam: 'Cultuur', categorie: ['cultuur', 'culture', 'entertainment', 'showbizz', 'muziek', 'film', 'media', 'arts'],
    termen: ['film$', 'films$', 'movie', 'bioscoop', 'cinema', 'muziek', 'music', 'concert', 'festival', 'album', 'zanger', 'zangeres',
      'singer', 'theater', 'museum', 'tentoonstelling', 'exhibition', 'kunstenaar', 'artist', 'schrijver', 'auteur', 'author$', 'authors$', 'nl:roman$',
      'boek$', 'boeken$', 'Songfestival', 'Eurovisie', 'Eurovision', 'televisie', 'Netflix', 'Oscar', 'Grammy', 'acteur', 'actrice',
      'actor', 'omroep', 'Sinterklaas'],
  },
  {
    id: 'sport', naam: 'Sport', categorie: ['sport', 'voetbal', 'wielrennen', 'tennis', 'schaatsen', 'formule 1', 'football', 'darts'],
    termen: ['voetbal', 'football', 'soccer', 'Eredivisie', 'Champions League', 'Europa League', 'Conference League', 'Ajax', 'PSV',
      'Feyenoord', 'AZ', 'Oranje', 'KNVB', 'wedstrijd', 'doelpunt', 'schaatsen', 'schaatser', 'skating', 'wielrennen', 'wielrenner',
      'tennis', 'Formule 1', 'Formula 1', 'F1', 'Verstappen', 'olympisch', 'Olympic', 'WK', 'EK', 'World Cup', 'atletiek', 'hockey',
      'darts', 'shorttrack', 'NBA', 'NFL', 'MLS', 'Premier League', 'Tour de France', 'FC', 'NEC', 'Messi', 'basketbal',
      'nl:trainer$', 'nl:keeper$', 'nl:aanvoerder'],
  },
  {
    id: 'onderwijs', naam: 'Onderwijs', categorie: ['onderwijs', 'education'],
    termen: ['school$', 'scholen', 'basisschool', 'middelbare school', 'leerlingen', 'onderwijs', 'education', 'docent', 'leraar',
      'leraren', 'teacher', 'examen', 'mbo', 'hbo', 'vwo', 'havo', 'collegegeld', 'studiefinanciering', 'studenten'],
  },
];

export const ONDERWERP_NAAM: Record<string, string> = Object.fromEntries(ONDERWERPEN.map((o) => [o.id, o.naam]));

/** Kleine letters niet, accenten weg. */
export const zonderAccenten = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '');

const AFKORTING = /^[A-Z0-9&]{1,5}$/;

/** Bouwt een zoekpatroon voor één term volgens de regels bovenaan. */
export function patroon(term: string): RegExp {
  const heel = term.endsWith('$');
  const t = zonderAccenten(heel ? term.slice(0, -1) : term);
  const gevoelig = /\p{Lu}/u.test(t);
  const woord = heel || AFKORTING.test(t);
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${esc}${woord ? '(?![\\p{L}\\p{N}])' : ''}`, gevoelig ? 'u' : 'iu');
}

/** Een term met nl: of en: telt alleen in die taal (brand = vuur in het Nederlands, merk in het Engels). */
const metTaal = (t: string) => {
  const m = /^(nl|en):(.*)$/.exec(t);
  return m ? { taal: m[1] as 'nl' | 'en', term: m[2] } : { taal: undefined, term: t };
};

const PATRONEN = new Map(ONDERWERPEN.map((o) => [o.id, {
  termen: o.termen.map(metTaal).map(({ taal, term }) => ({ t: term.replace(/\$$/, ''), r: patroon(term), taal })),
  categorie: [...(o.categorie ?? []), o.naam].map((t) => ({ t, r: patroon(t) })),
}]));

export type Herkenbaar = {
  titel: string; samenvatting: string; categorieen?: string[]; reikwijdte: Reikwijdte; bronOnderwerpen?: string[]; taal?: 'nl' | 'en';
};

/**
 * Onderwerpen voor een feedbericht. Onderwerpen van de bron tellen altijd. Een feedcategorie of een
 * trefwoord in de kop telt 2 punten, een trefwoord in de samenvatting 1. Vanaf 2 punten telt een
 * onderwerp mee; maximaal 3, sterkste eerst.
 */
export function herkenOnderwerpen(i: Herkenbaar): Herkomst[] {
  const uit: Herkomst[] = (i.bronOnderwerpen ?? []).map((id) => ({ id, via: 'bron' as const }));
  const kop = zonderAccenten(i.titel);
  const tekst = zonderAccenten(i.samenvatting ?? '');
  const cats = (i.categorieen ?? []).map(zonderAccenten);
  const kandidaten: { h: Herkomst; punten: number }[] = [];
  for (const o of ONDERWERPEN) {
    if (uit.some((u) => u.id === o.id)) continue;
    if (o.alleen && !o.alleen.includes(i.reikwijdte)) continue;
    const p = PATRONEN.get(o.id)!;
    const cat = p.categorie.find((c) => cats.some((x) => c.r.test(x)));
    if (cat) { kandidaten.push({ h: { id: o.id, via: 'categorie', term: cats.find((x) => cat.r.test(x)) }, punten: 3 }); continue; }
    let punten = 0;
    let eerste: string | undefined;
    for (const t of p.termen) {
      if (t.taal && t.taal !== (i.taal ?? 'nl')) continue;
      if (t.r.test(kop)) { punten += 2; eerste ??= t.t; } else if (t.r.test(tekst)) { punten += 1; eerste ??= t.t; }
      if (punten >= 4) break;
    }
    if (punten >= 2) kandidaten.push({ h: { id: o.id, via: 'trefwoord', term: eerste }, punten });
  }
  kandidaten.sort((a, b) => b.punten - a.punten);
  return [...uit, ...kandidaten.map((k) => k.h)].slice(0, Math.max(3, uit.length));
}

export type Koppelbaar = { id: string; koppel?: string[][] };

/**
 * Koppelt een bericht aan een lopend verhaal als alle termen van één groep in kop of samenvatting staan
 * én minstens één ervan in de kop. Passen meerdere verhalen even goed, dan wordt er niet gekoppeld.
 */
export function koppelVerhaal(i: { titel: string; samenvatting: string }, verhalen: Koppelbaar[]): string | undefined {
  const kop = zonderAccenten(i.titel);
  const alles = `${kop} ${zonderAccenten(i.samenvatting ?? '')}`;
  const scores: { id: string; score: number }[] = [];
  for (const v of verhalen) {
    let beste = 0;
    for (const groep of v.koppel ?? []) {
      const r = groep.map(patroon);
      if (r.every((x) => x.test(alles)) && r.some((x) => x.test(kop))) beste = Math.max(beste, groep.length);
    }
    if (beste) scores.push({ id: v.id, score: beste });
  }
  if (!scores.length) return undefined;
  scores.sort((a, b) => b.score - a.score);
  if (scores[1] && scores[1].score === scores[0].score) return undefined;
  return scores[0].id;
}

const NL = new Set(['de', 'het', 'een', 'van', 'en', 'op', 'met', 'voor', 'niet', 'zijn', 'wordt', 'naar', 'bij', 'ook', 'dat', 'die']);
const EN = new Set(['the', 'of', 'and', 'to', 'in', 'for', 'on', 'with', 'is', 'are', 'was', 'after', 'from', 'by', 'as', 'that']);

/** Taal van een kop plus samenvatting: telt veelvoorkomende woorden. */
export function taalVan(tekst: string): 'nl' | 'en' {
  let nl = 0;
  let en = 0;
  for (const w of tekst.toLowerCase().split(/[^\p{L}]+/u)) {
    if (NL.has(w)) nl++;
    if (EN.has(w)) en++;
  }
  return en > nl ? 'en' : 'nl';
}
