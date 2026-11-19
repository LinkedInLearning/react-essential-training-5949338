import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { YrkesVal } from "./YrkesVal";

const TABLE_URL = "https://statistikdatabasen.scb.se/api/v2/tables/TAB5932";
const SOURCE_URL =
  "https://www.statistikdatabasen.scb.se/pxweb/sv/ssd/START__AM__AM0110__AM0110A/LoneSpridSektYrk4AN/";

const MEASURES = [
  {
    code: "000007CE",
    label: "Medianlön",
    description: "50 procent har denna lön eller lägre.",
  },
  {
    code: "000007CD",
    label: "Medellön",
    description: "Den genomsnittliga månadslönen.",
  },
  {
    code: "000007CG",
    label: "25:e percentilen",
    description: "25 procent har denna lön eller lägre.",
  },
  {
    code: "000007CH",
    label: "75:e percentilen",
    description: "75 procent har denna lön eller lägre.",
  },
];

async function getScbData(path) {
  "use cache";
  cacheLife("days");

  const response = await fetch(`${TABLE_URL}/${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`SCB svarade med HTTP ${response.status}`);
  }

  return response.json();
}

function getSelection(value, labels, fallback) {
  if (typeof value === "string" && Object.hasOwn(labels, value)) {
    return value;
  }

  return fallback;
}

function formatSalary(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Uppgift saknas";
  }

  return `${new Intl.NumberFormat("sv-SE").format(value)} kr`;
}

const fieldClass =
  "w-full min-w-0 rounded-xl border-2 border-slate-950 bg-white px-4 py-3 text-base text-slate-950 outline-none focus-visible:ring-4 focus-visible:ring-yellow-300/70";
const cardClass = "rounded-2xl border-2 border-slate-950 bg-white p-5 shadow-[4px_4px_0_#c7d2fe] sm:p-6";

async function getSelections(searchParams) {
  const [params, metadata] = await Promise.all([searchParams, getScbData("metadata?lang=sv")]);

  const occupations = metadata.dimension.Yrke2012.category.label;
  const sectors = metadata.dimension.Sektor.category.label;
  const years = metadata.dimension.Tid.category.label;
  const yearCodes = Object.keys(years).sort((a, b) => Number(b) - Number(a));

  return {
    occupations,
    sectors,
    years,
    yearCodes,
    occupation: getSelection(params.yrke, occupations, "0000"),
    sector: getSelection(params.sektor, sectors, "0"),
    year: getSelection(params.ar, years, yearCodes[0]),
  };
}

function SalaryForm({ selections }) {
  const { occupations, sectors, years, yearCodes, occupation, sector, year } = selections;

  // "Samtliga yrken" överst, resten i bokstavsordning.
  const yrken = Object.entries(occupations)
    .map(([kod, namn]) => ({ kod, namn }))
    .sort((a, b) => (a.kod === "0000" ? -1 : b.kod === "0000" ? 1 : a.namn.localeCompare(b.namn, "sv")));

  return (
    <form action="/loner" method="GET" className="mt-7 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <YrkesVal key={occupation} yrken={yrken} startKod={occupation} faltKlass={fieldClass} />
      </div>

      <div>
        <label htmlFor="sektor" className="mb-2 block text-sm font-semibold text-indigo-100">
          Sektor
        </label>
        <select id="sektor" name="sektor" defaultValue={sector} className={fieldClass}>
          {Object.entries(sectors).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="ar" className="mb-2 block text-sm font-semibold text-indigo-100">
          Statistikår
        </label>
        <select id="ar" name="ar" defaultValue={year} className={fieldClass}>
          {yearCodes.map((code) => (
            <option key={code} value={code}>{years[code]}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="w-full rounded-xl border-2 border-slate-950 bg-yellow-300 px-7 py-3 font-bold text-slate-950 shadow-[3px_3px_0_#0f172a] transition hover:-translate-y-0.5 hover:bg-yellow-200 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transform-none sm:col-span-2 sm:w-auto sm:justify-self-start"
      >
        Visa lönestatistik <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}

function ErrorBox({ title, text }) {
  return (
    <div role="alert" className="mt-8 rounded-2xl border-2 border-slate-950 bg-white p-6">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-slate-600">{text}</p>
      <a href="/loner" className="mt-4 inline-block font-bold text-indigo-700 underline">
        Försök igen
      </a>
    </div>
  );
}

async function SalaryFormWithQuery({ searchParams }) {
  let selections;
  try {
    selections = await getSelections(searchParams);
  } catch (error) {
    console.error("Kunde inte hämta SCB:s yrkeslista", error);
    return (
      <p className="mt-7 rounded-xl border-2 border-slate-950 bg-white px-4 py-3 font-medium text-slate-950">
        Yrkeslistan kunde inte hämtas från SCB just nu.
      </p>
    );
  }

  return <SalaryForm selections={selections} />;
}

async function SalaryResults({ searchParams }) {
  let selections;
  try {
    selections = await getSelections(searchParams);
  } catch {
    return <ErrorBox title="Lönestatistiken kunde inte hämtas" text="SCB svarar inte just nu. Försök igen om en stund." />;
  }

  const { occupations, sectors, occupation, sector, year } = selections;

  const query = new URLSearchParams({
    lang: "sv",
    outputFormat: "json-stat2",
    "valueCodes[Yrke2012]": occupation,
    "valueCodes[Sektor]": sector,
    "valueCodes[Kon]": "1+2",
    "valueCodes[Tid]": year,
    "valueCodes[ContentsCode]": MEASURES.map((measure) => measure.code).join(","),
  });

  let dataset;
  try {
    dataset = await getScbData(`data?${query.toString()}`);
  } catch (error) {
    console.error("Kunde inte hämta SCB:s löneuppgifter", error);
    return <ErrorBox title="Lönestatistiken kunde inte hämtas" text="SCB kunde inte lämna ett svar just nu. Försök igen om en stund." />;
  }

  return (
    <section aria-labelledby="salary-results" className="mt-10">
      <div className="mb-6">
        <h2 id="salary-results" className="break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          {occupations[occupation]}
        </h2>
        <p className="mt-1 font-medium text-slate-700">
          {sectors[sector]} · Hela Sverige · Kvinnor och män · {year}
        </p>
        <p className="mt-2 text-sm text-slate-600">Månadslön före skatt, uppräknad till heltid.</p>
      </div>

      <dl className="grid gap-5 sm:grid-cols-2">
        {MEASURES.map((measure, i) => {
          // Övriga dimensioner har ett enda valt värde i denna fråga.
          const index = dataset.dimension.ContentsCode.category.index[measure.code];
          const value = dataset.value[index];
          const featured = i === 0;

          return (
            <div
              key={measure.code}
              className={featured ? "rounded-2xl border-2 border-slate-950 bg-yellow-300 p-5 shadow-[4px_4px_0_#0f172a] sm:p-6" : cardClass}
            >
              <dt className={`font-semibold ${featured ? "text-slate-950" : "text-indigo-700"}`}>{measure.label}</dt>
              <dd className="mt-3 text-3xl font-black tracking-tight text-slate-950 tabular-nums sm:text-4xl">
                {formatSalary(value)}
              </dd>
              <dd className={`mt-2 text-sm ${featured ? "text-slate-800" : "text-slate-600"}`}>{measure.description}</dd>
            </div>
          );
        })}
      </dl>

      <div className="mt-8 border-t border-slate-200 pt-5 text-sm leading-relaxed text-slate-500">
        <p>
          Lönen påverkas bland annat av erfarenhet, ansvar och arbetsuppgifter.
          Uppgift saknas när statistiken är otillgänglig, för osäker eller skyddad av sekretess.
        </p>
        <p className="mt-3">Källa SCB / Medlingsinstitutet. Tabell TAB5932. Statistikår {year}.</p>
        <a
          href={SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block font-semibold text-indigo-700 underline underline-offset-4 hover:text-indigo-900"
        >
          Läs tabellen och metodinformationen hos SCB (ny flik)
        </a>
      </div>
    </section>
  );
}

export default function SalaryPage({ searchParams }) {
  return (
    <main className="mx-auto w-full max-w-6xl rounded-2xl bg-slate-50 px-4 py-8 font-sans sm:px-8 sm:py-10">
      <header className="rounded-2xl border-2 border-slate-950 bg-indigo-600 p-5 shadow-[6px_6px_0_#0f172a] sm:p-9">
        <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-white [text-shadow:2px_2px_0_#0f172a] sm:text-5xl">
          Vad tjänar <span className="text-yellow-300">ett yrke?</span>
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-indigo-100">
          Utforska löner för olika yrkesgrupper som underlag för yrkesval och samtal med din coach.
        </p>
        <Suspense fallback={<p role="status" className="mt-7 font-medium text-indigo-100">Hämtar yrkeslistan…</p>}>
          <SalaryFormWithQuery searchParams={searchParams} />
        </Suspense>
      </header>

      <Suspense fallback={<p role="status" className="mt-10 text-lg font-medium text-indigo-800">Hämtar lönestatistik från SCB…</p>}>
        <SalaryResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
