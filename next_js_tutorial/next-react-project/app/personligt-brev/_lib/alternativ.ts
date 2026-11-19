// Alla val som går att göra för brevet. Delas av klienten (för att rita upp
// knapparna) och servern (för att validera och bygga prompten).

type Val = { label: string; beskrivning: string; prompt: string };

export const BREVSPRAK = {
  sv: { label: "Svenska", beskrivning: "Brevet skrivs på svenska", prompt: "Skriv brevet på svenska." },
  en: { label: "Engelska", beskrivning: "För internationella företag", prompt: "Write the letter in English (natural, idiomatic British or international English)." },
} satisfies Record<string, Val>;

export const SPRAKNIVAER = {
  enkel: {
    label: "Enkel",
    beskrivning: "Korta meningar och vanliga ord. Bra om du lär dig svenska.",
    prompt: "Använd enkelt och lättläst språk (ungefär nivå B1): korta meningar, vanliga ord, en tanke per mening, inga idiom och inga facktermer som inte står i annonsen. Det ska ändå låta vuxet och professionellt.",
  },
  medel: {
    label: "Mellan",
    beskrivning: "Tydligt, naturligt och lätt att läsa.",
    prompt: "Använd ett tydligt, naturligt och vårdat språk på normal nivå, med variation i meningslängd.",
  },
  avancerad: {
    label: "Avancerad",
    beskrivning: "Rikare ordförråd och mer varierade meningar.",
    prompt: "Använd ett avancerat och nyanserat språk med rikt ordförråd, varierad meningsbyggnad och branschens fackspråk där det passar, men aldrig krångligt för krånglighetens skull.",
  },
} satisfies Record<string, Val>;

export const TONER = {
  professionell: {
    label: "Professionell & varm",
    beskrivning: "Säkert standardval för de flesta jobb.",
    prompt: "Tonen ska vara professionell men varm och mänsklig.",
  },
  formell: {
    label: "Formell",
    beskrivning: "Myndigheter, juridik, bank och liknande.",
    prompt: "Tonen ska vara formell och korrekt, utan att bli stel. Inga utropstecken.",
  },
  personlig: {
    label: "Personlig",
    beskrivning: "Visar mer av vem du är som person.",
    prompt: "Tonen ska vara personlig och visa vem den sökande är, med en kort personlig berättelse om det finns stöd för det i underlaget.",
  },
  entusiastisk: {
    label: "Entusiastisk",
    beskrivning: "Energi och engagemang – startups, service, försäljning.",
    prompt: "Tonen ska vara entusiastisk och energisk, men trovärdig. Max ett utropstecken i hela brevet.",
  },
  rak: {
    label: "Rak & koncis",
    beskrivning: "Saklig, inga omsvep. Tech och teknikroller.",
    prompt: "Tonen ska vara rak, saklig och koncis. Inga utsmyckningar, varje mening ska bära information.",
  },
  kreativ: {
    label: "Kreativ",
    beskrivning: "Sticker ut – för kreativa branscher.",
    prompt: "Tonen ska vara kreativ och minnesvärd, gärna med en oväntad inledning, men fortfarande relevant och professionell.",
  },
} satisfies Record<string, Val>;

export const LANGDER = {
  kort: { label: "Kort", beskrivning: "Ca 150–200 ord", prompt: "Brevet ska vara 150–200 ord." },
  normal: { label: "Normal", beskrivning: "Ca 250–330 ord", prompt: "Brevet ska vara 250–330 ord." },
  utforlig: { label: "Utförlig", beskrivning: "Ca 350–430 ord, max en sida", prompt: "Brevet ska vara 350–430 ord och får inte bli längre än en A4-sida." },
} satisfies Record<string, Val>;

export const SITUATIONER = {
  erfaren: {
    label: "Jag har relevant erfarenhet",
    beskrivning: "",
    prompt: "Den sökande har relevant erfarenhet. Lyft konkreta resultat och ansvar från tidigare roller.",
  },
  student: {
    label: "Student eller nyexaminerad",
    beskrivning: "",
    prompt: "Den sökande är student eller nyexaminerad. Lyft utbildning, projekt, examensarbete, extrajobb och föreningsliv som belägg, och visa lärvilja utan att be om ursäkt för bristande erfarenhet.",
  },
  karriarbyte: {
    label: "Byter karriär",
    beskrivning: "",
    prompt: "Den sökande byter karriär. Förklara bytet kort och positivt och visa hur erfarenheter från den tidigare branschen är överförbara till den nya rollen.",
  },
  aterkomst: {
    label: "Tillbaka efter uppehåll",
    beskrivning: "",
    prompt: "Den sökande kommer tillbaka efter ett uppehåll (t.ex. föräldraledighet, studier, sjukdom eller arbetslöshet). Nämn inte uppehållet i onödan; om det behövs, en kort neutral mening. Fokusera framåt.",
  },
  forsta: {
    label: "Första jobbet / sommarjobb",
    beskrivning: "",
    prompt: "Det här är den sökandes första jobb eller ett sommar-/extrajobb. Lyft skola, fritidsintressen, ideellt arbete och personliga egenskaper med konkreta exempel. Håll det enkelt och ärligt.",
  },
  praktik: {
    label: "Praktik, LIA eller exjobb",
    beskrivning: "",
    prompt: "Den sökande söker praktik, LIA eller examensarbete. Var tydlig med utbildning, period och vad den sökande vill lära sig och kan bidra med.",
  },
} satisfies Record<string, Val>;

export const FOKUS = {
  resultat: { label: "Resultat & siffror", prompt: "mätbara resultat" },
  samarbete: { label: "Samarbete", prompt: "samarbete och hur den sökande fungerar i grupp" },
  ledarskap: { label: "Ledarskap", prompt: "ledarskap och ansvarstagande" },
  teknik: { label: "Tekniska kunskaper", prompt: "tekniska och yrkesspecifika kunskaper" },
  kund: { label: "Kund- & servicekänsla", prompt: "kundfokus och service" },
  problemlosning: { label: "Problemlösning", prompt: "problemlösning" },
  larande: { label: "Lärvillighet", prompt: "nyfikenhet och snabb inlärning" },
  motivation: { label: "Varför just ni", prompt: "motivationen för just den här arbetsgivaren och branschen" },
} as const;

export const MAX_FOKUS = 3;

// Snabbknappar för att justera ett färdigt brev.
export const REVISIONER = {
  kortare: { label: "Kortare", prompt: "Gör brevet ungefär 30 % kortare utan att tappa de starkaste exemplen." },
  enklare: { label: "Enklare språk", prompt: "Skriv om brevet med enklare och mer lättläst språk: kortare meningar och vanligare ord." },
  personligare: { label: "Mer personligt", prompt: "Gör brevet mer personligt och mänskligt, så att det låter mindre som en mall." },
  formellare: { label: "Mer formellt", prompt: "Gör tonen mer formell och korrekt." },
  konkretare: { label: "Mer konkret", prompt: "Gör brevet mer konkret: ersätt allmänna påståenden med specifika exempel från CV:t, eller tydliga platshållare där exempel saknas." },
  inledning: { label: "Starkare inledning", prompt: "Skriv en ny, starkare och mer originell första mening/inledning. Behåll resten så likt som möjligt." },
  klyschor: { label: "Ta bort klyschor", prompt: "Ta bort alla klyschor och tomma självberöm. Ersätt dem med belägg eller stryk dem." },
} as const;

export type BrevInstallningar = {
  sprak: keyof typeof BREVSPRAK;
  niva: keyof typeof SPRAKNIVAER;
  ton: keyof typeof TONER;
  langd: keyof typeof LANGDER;
  situation: keyof typeof SITUATIONER;
  fokus: (keyof typeof FOKUS)[];
  namn: string;
  kontaktperson: string;
  extra: string;
};

export const STANDARD_INSTALLNINGAR: BrevInstallningar = {
  sprak: "sv",
  niva: "medel",
  ton: "professionell",
  langd: "normal",
  situation: "erfaren",
  fokus: [],
  namn: "",
  kontaktperson: "",
  extra: "",
};

export const GRANSER = {
  annons: 15000,
  cv: 20000,
  brev: 8000,
  extra: 1500,
  namn: 80,
  instruktion: 500,
} as const;

// Ord som ofta får rekryterare att sucka. Används för en enkel varning i gränssnittet.
export const KLYSCHOR = [
  "driven",
  "flexibel",
  "lagspelare",
  "brinner för",
  "härmed",
  "stresstålig",
  "social och utåtriktad",
  "noggrann och strukturerad",
  "jag är den ni söker",
  "ser fram emot att höra från er",
  "team player",
  "hard-working",
  "hardworking",
  "passionate about",
  "go-getter",
  "i am writing to apply",
];

// Svaret från /api/brev/matchning.
export type Matchning = {
  sammanfattning: string;
  krav: { krav: string; typ: "krav" | "meriterande"; status: "uppfyllt" | "delvis" | "saknas"; belagg: string }[];
  styrkor: string[];
  tips: string[];
  nyckelord: string[];
  intervjufragor: string[];
};
