import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hamtaLan, type Lan } from "./geografi";
import { OrtFilter } from "./OrtFilter";

const PAGE_SIZE = 12;
const MAX_PAGE = Math.floor(2000 / PAGE_SIZE) + 1;

const SORT_OPTIONS = {
  relevance: "Bäst matchning",
  "pubdate-desc": "Nyast först",
  "pubdate-asc": "Äldst först",
};

const PERIOD_OPTIONS = {
  all: "Alla publiceringsdatum",
  "7": "Senaste 7 dagarna",
  "30": "Senaste 30 dagarna",
};

type JobAd = {
  id: string;
  headline: string;
  brief?: string | null;
  employer?: { name?: string | null } | null;
  occupation_group?: { label?: string | null } | null;
  occupation_field?: { label?: string | null } | null;
  workplace_addresses?: {
    municipality?: string | null;
    region?: string | null;
    country?: string | null;
  }[] | null;
  publication_date?: string | null;
  source_links?: { label?: string | null; url: string }[] | null;
};

type SearchResult = {
  total: { value: number };
  hits: JobAd[];
};

type PageProps = {
  searchParams: Promise<{
    q?: string | string[];
    sort?: string | string[];
    period?: string | string[];
    page?: string | string[];
    lan?: string | string[];
    kommun?: string | string[];
  }>;
};

type SearchOptions = {
  query: string;
  sort: keyof typeof SORT_OPTIONS;
  period: keyof typeof PERIOD_OPTIONS;
  page: number;
  regionIds: string[];
  municipalityIds: string[];
};

const DEFAULT_OPTIONS: SearchOptions = {
  query: "",
  sort: "pubdate-desc",
  period: "all",
  page: 1,
  regionIds: [],
  municipalityIds: [],
};

// Taxonomi-id:n ser ut som "DQZd_uYs_oKb". Släpp bara igenom sådana.
function getConceptIds(value?: string | string[]) {
  const values = value === undefined ? [] : Array.isArray(value) ? value : [value];
  return [...new Set(values.filter((id) => /^[A-Za-z0-9_]{1,30}$/.test(id)))].slice(0, 300);
}

async function getSearchOptions(searchParams: PageProps["searchParams"]): Promise<SearchOptions> {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const defaultSort = query ? "relevance" : "pubdate-desc";
  const sort = typeof params.sort === "string" && Object.hasOwn(SORT_OPTIONS, params.sort)
    ? (params.sort as SearchOptions["sort"])
    : defaultSort;
  const period = params.period === "7" || params.period === "30" ? params.period : "all";
  const requestedPage = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, MAX_PAGE)
    : 1;

  return {
    query,
    sort,
    period,
    page,
    regionIds: getConceptIds(params.lan),
    municipalityIds: getConceptIds(params.kommun),
  };
}

function getPageHref(options: SearchOptions, page: number) {
  const params = new URLSearchParams({
    sort: options.sort,
    period: options.period,
    page: String(page),
  });

  if (options.query) params.set("q", options.query);
  for (const id of options.regionIds) params.append("lan", id);
  for (const id of options.municipalityIds) params.append("kommun", id);

  return `/jobb?${params.toString()}`;
}

// Gör om användarens val till API-parametrar.
// Endast hela län → `region`. Finns enskilda kommuner med i valet skickas allt som
// `municipality` (hela län expanderas till sina kommuner), så att alla val blir ett
// enda "eller"-filter och vi slipper gissa hur API:et kombinerar region + kommun.
function getGeoFilter(options: SearchOptions, lanLista: Lan[]) {
  if (lanLista.length === 0) {
    return { region: options.regionIds, municipality: options.municipalityIds, labels: [] as string[] };
  }

  const lanById = new Map(lanLista.map((lan) => [lan.id, lan]));
  const kommunById = new Map(lanLista.flatMap((lan) => lan.kommuner.map((k) => [k.id, k] as const)));

  const valdaLan = options.regionIds.flatMap((id) => lanById.get(id) ?? []);
  const valdaKommuner = options.municipalityIds.flatMap((id) => kommunById.get(id) ?? []);
  const labels = [...valdaLan.map((l) => l.namn), ...valdaKommuner.map((k) => k.namn)];

  if (valdaKommuner.length === 0) {
    return { region: valdaLan.map((l) => l.id), municipality: [], labels };
  }

  const municipality = new Set([
    ...valdaKommuner.map((k) => k.id),
    ...valdaLan.flatMap((l) => l.kommuner.map((k) => k.id)),
  ]);

  return { region: [], municipality: [...municipality], labels };
}

function getLocation(job: JobAd) {
  const locations = (job.workplace_addresses ?? [])
    .map((address) => address.municipality || address.region || address.country)
    .filter((location): location is string => Boolean(location));

  return [...new Set(locations)].join(" · ") || "Ort saknas";
}

function formatDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Stockholm",
  }).format(date);
}

function SearchForm({ options, lan }: { options: SearchOptions; lan: Lan[] }) {
  const fieldClass =
    "w-full min-w-0 rounded-xl border-2 border-slate-950 bg-white px-4 py-3 text-base text-slate-950 outline-none focus-visible:ring-4 focus-visible:ring-yellow-300/70";

  return (
    <form action="/jobb" method="GET" className="mt-7 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="job-query" className="mb-2 block font-semibold text-white">
          Vad vill du jobba med och var?
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="job-query"
            name="q"
            type="search"
            defaultValue={options.query}
            placeholder="Till exempel React Göteborg eller Flen"
            className={`${fieldClass} flex-1 placeholder:text-slate-500`}
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl border-2 border-slate-950 bg-yellow-300 px-7 py-3 font-bold text-slate-950 shadow-[3px_3px_0_#0f172a] transition hover:-translate-y-0.5 hover:bg-yellow-200 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transform-none"
          >
            Hitta jobb <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>

      <div className="sm:col-span-2">
        <OrtFilter
          // key gör att filtret nollställs när användaren navigerar till en ny sökning.
          key={[...options.regionIds, ...options.municipalityIds].join(",")}
          lan={lan}
          valdaLan={options.regionIds}
          valdaKommuner={options.municipalityIds}
        />
      </div>

      <div>
        <label htmlFor="job-sort" className="mb-2 block text-sm font-semibold text-indigo-100">
          Sortering
        </label>
        <select id="job-sort" name="sort" defaultValue={options.sort} className={fieldClass}>
          {Object.entries(SORT_OPTIONS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="job-period" className="mb-2 block text-sm font-semibold text-indigo-100">
          Publicerad
        </label>
        <select id="job-period" name="period" defaultValue={options.period} className={fieldClass}>
          {Object.entries(PERIOD_OPTIONS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
    </form>
  );
}

async function SearchFormWithQuery({ searchParams }: PageProps) {
  const [options, lan] = await Promise.all([getSearchOptions(searchParams), hamtaLan()]);
  return <SearchForm options={options} lan={lan} />;
}

function JobCard({ job }: { job: JobAd }) {
  const date = formatDate(job.publication_date);
  const sources = (job.source_links ?? []).filter((source) => /^https?:\/\//i.test(source.url));

  return (
    <li className="flex min-w-0 flex-col rounded-2xl border-2 border-slate-950 bg-white p-5 shadow-[4px_4px_0_#c7d2fe] sm:p-6">
      <article className="flex h-full min-w-0 flex-col">
        {job.occupation_field?.label && (
          <p className="mb-3 text-sm font-semibold text-indigo-700">{job.occupation_field.label}</p>
        )}

        <h3 className="break-words text-xl font-bold leading-snug tracking-tight text-slate-950">
          {job.headline}
        </h3>
        <p className="mt-3 break-words font-medium text-slate-700">
          {job.employer?.name || "Arbetsgivare saknas"}
        </p>

        <dl className="mt-4 space-y-1.5 text-sm text-slate-600">
          <div className="flex gap-2">
            <dt className="shrink-0 font-semibold text-slate-800">Plats</dt>
            <dd className="min-w-0 break-words">{getLocation(job)}</dd>
          </div>
          {date && (
            <div className="flex gap-2">
              <dt className="font-semibold text-slate-800">Publicerad</dt>
              <dd><time dateTime={job.publication_date ?? undefined}>{date}</time></dd>
            </div>
          )}
        </dl>

        {job.brief && (
          <p className="mt-5 line-clamp-3 break-words text-sm leading-relaxed text-slate-600">
            {job.brief}
          </p>
        )}

        <div className="mt-auto pt-6">
          {sources.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {sources.map((source, index) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visa annons för ${job.headline} hos ${source.label || "annonskällan"}, öppnas i ny flik`}
                  className={`inline-flex min-w-0 max-w-full flex-col rounded-lg border-2 border-slate-950 px-4 py-2 text-slate-950 transition-colors focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${index === 0 ? "bg-yellow-300 hover:bg-yellow-200" : "bg-white hover:bg-indigo-50"}`}
                >
                  <span className="font-bold">Visa annons <span aria-hidden="true">↗</span></span>
                  <span className="break-all text-xs">{source.label || "Annonskällan"}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Annonslänk saknas.</p>
          )}
          <Link
            href={`/personligt-brev?${new URLSearchParams({
              url: sources[0]?.url ?? "",
              titel: job.headline,
              arbetsgivare: job.employer?.name ?? "",
              text: job.brief ?? "",
            }).toString()}`}
            prefetch={false}
            className="mt-3 inline-flex items-center gap-1 font-semibold text-indigo-700 underline underline-offset-4 hover:text-indigo-900"
          >
            Skriv personligt brev <span aria-hidden="true">✍️</span>
          </Link>
        </div>
      </article>
    </li>
  );
}

async function JobResults({ searchParams }: PageProps) {
  await connection();
  const [options, lanLista] = await Promise.all([getSearchOptions(searchParams), hamtaLan()]);
  const geo = getGeoFilter(options, lanLista);
  const offset = (options.page - 1) * PAGE_SIZE;
  const url = new URL("https://links.api.jobtechdev.se/joblinks");
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("sort", options.sort);

  if (options.query) url.searchParams.set("q", options.query);
  for (const id of geo.region) url.searchParams.append("region", id);
  for (const id of geo.municipality) url.searchParams.append("municipality", id);
  if (options.period !== "all") {
    const since = new Date(Date.now() - Number(options.period) * 24 * 60 * 60 * 1000);
    url.searchParams.set("published-after", since.toISOString().slice(0, 19));
  }

  let result: SearchResult;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new Error(`JobAd Links svarade med HTTP ${response.status}`);

    result = (await response.json()) as SearchResult;
    if (!Array.isArray(result.hits) || !Number.isFinite(result.total?.value)) {
      throw new Error("JobAd Links skickade ett oväntat svarsformat");
    }
  } catch (error) {
    console.error("Kunde inte hämta annonser från JobAd Links", error);

    return (
      <div role="alert" className="mt-8 rounded-2xl border-2 border-slate-950 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-950">Jobben kunde inte hämtas just nu</h2>
        <p className="mt-2 text-slate-600">Försök igen om en stund.</p>
        <a href={getPageHref(options, options.page)} className="mt-4 inline-block font-bold text-indigo-700 underline">
          Försök igen
        </a>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.min(Math.ceil(result.total.value / PAGE_SIZE), MAX_PAGE));
  if (options.page > totalPages) redirect(getPageHref(options, totalPages));

  const numberFormat = new Intl.NumberFormat("sv-SE");
  const firstResult = result.hits.length > 0 ? offset + 1 : 0;
  const lastResult = offset + result.hits.length;

  return (
    <section aria-labelledby="job-results" className="mt-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="job-results" className="break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {options.query ? `Resultat för ”${options.query}”` : "Lediga jobb"}
          </h2>
          {geo.labels.length > 0 && (
            <p className="mt-1 break-words font-medium text-slate-700">i {geo.labels.join(", ")}</p>
          )}
          <p className="mt-2 text-sm text-slate-600">
            {numberFormat.format(result.total.value)} träffar · Visar {firstResult}–{lastResult}
          </p>
        </div>
        <Link href="/jobb" prefetch={false} className="font-semibold text-indigo-700 underline underline-offset-4">
          Rensa sökningen
        </Link>
      </div>

      {result.hits.length === 0 && (
        <div className="rounded-2xl border-2 border-slate-950 bg-white p-8">
          <h3 className="text-xl font-bold text-slate-950">Inga jobb matchade din sökning</h3>
          <p className="mt-3 text-slate-600">Prova ett annat sökord, en annan ort eller ett längre publiceringsintervall.</p>
        </div>
      )}

      <ul className="grid gap-5 lg:grid-cols-2">
        {result.hits.map((job) => <JobCard key={job.id} job={job} />)}
      </ul>

      {totalPages > 1 && (
        <nav aria-label="Sidor med sökresultat" className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-3">
            {options.page > 1 && (
              <Link href={getPageHref(options, options.page - 1)} prefetch={false} className="rounded-xl border-2 border-slate-950 bg-white px-4 py-3 font-bold text-slate-950 hover:bg-indigo-50 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                ← Föregående
              </Link>
            )}
            {options.page < totalPages && (
              <Link href={getPageHref(options, options.page + 1)} prefetch={false} className="rounded-xl border-2 border-slate-950 bg-indigo-600 px-4 py-3 font-bold text-white shadow-[3px_3px_0_#0f172a] hover:bg-indigo-700 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                Nästa →
              </Link>
            )}
          </div>
          <p className="text-sm font-medium text-slate-600">Sida {options.page} av {totalPages}</p>
        </nav>
      )}

      {result.total.value > MAX_PAGE * PAGE_SIZE && (
        <p className="mt-5 text-sm text-slate-600">Förfina sökningen för att nå fler träffar än de första {numberFormat.format(MAX_PAGE * PAGE_SIZE)}.</p>
      )}

      <p className="mt-8 border-t border-slate-200 pt-5 text-sm leading-relaxed text-slate-500">
        Annonser via Arbetsförmedlingens JobAd Links. Underlaget uppdateras dagligen.
        Hela annonsen och ansökningsinformationen finns hos respektive annonskälla. Länkar öppnas i en ny flik.
      </p>
    </section>
  );
}

export default function JobsPage({ searchParams }: PageProps) {
  return (
    <main className="mx-auto w-full max-w-6xl rounded-2xl bg-slate-50 px-4 py-8 font-sans sm:px-8 sm:py-10">
      <header className="rounded-2xl border-2 border-slate-950 bg-indigo-600 p-5 shadow-[6px_6px_0_#0f172a] sm:p-9">
        <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-white [text-shadow:2px_2px_0_#0f172a] sm:text-5xl">
          Hitta ditt <span className="text-yellow-300">nästa jobb.</span>
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-indigo-100">
          Sök bland annonser från flera jobbsajter med yrke, kompetens eller ort.
        </p>
        <Suspense fallback={<SearchForm options={DEFAULT_OPTIONS} lan={[]} />}>
          <SearchFormWithQuery searchParams={searchParams} />
        </Suspense>
      </header>

      <Suspense fallback={<p role="status" className="mt-10 text-lg font-medium text-indigo-800">Hämtar jobb…</p>}>
        <JobResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}