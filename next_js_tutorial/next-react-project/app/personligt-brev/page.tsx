import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { BrevStudio } from "./BrevStudio";

export const metadata: Metadata = {
  title: "Skriv personligt brev med AI",
  description: "Skapa ett personligt brev anpassat efter annonsen och ditt CV.",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function param(value: string | string[] | undefined, max: number) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

// Läser parametrar när man kommer från jobbsöket: /personligt-brev?url=...&titel=...
async function StudioMedAnnons({ searchParams }: PageProps) {
  const params = await searchParams;
  const url = param(params.url, 2000);

  return (
    <BrevStudio
      startUrl={/^https?:\/\//i.test(url) ? url : ""}
      startText={param(params.text, 3000)}
      startTitel={param(params.titel, 200)}
      startArbetsgivare={param(params.arbetsgivare, 200)}
    />
  );
}

export default function PersonligtBrevPage({ searchParams }: PageProps) {
  return (
    <main className="mx-auto w-full max-w-6xl rounded-2xl bg-slate-50 px-4 py-8 font-sans sm:px-8 sm:py-10 print:max-w-none print:bg-white print:p-0">
      <header className="rounded-2xl border-2 border-slate-950 bg-indigo-600 p-5 shadow-[6px_6px_0_#0f172a] sm:p-9 print:hidden">
        <Link href="/jobb" className="text-sm font-semibold text-indigo-100 underline underline-offset-4 hover:text-white">
          ← Till jobbsöket
        </Link>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight text-white [text-shadow:2px_2px_0_#0f172a] sm:text-5xl">
          Skriv ett brev som <span className="text-yellow-300">sticker ut.</span>
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-indigo-100">
          Lägg in annonsen och ditt CV, välj ton och språknivå – så skriver AI:n ett första utkast som bygger på dina riktiga erfarenheter.
        </p>
        <ol className="mt-6 flex flex-wrap gap-3 text-sm font-bold text-slate-950">
          {["Annonsen", "Ditt CV", "Stil", "Finslipa"].map((steg, i) => (
            <li key={steg} className="rounded-full border-2 border-slate-950 bg-white px-3 py-1">
              <span className="text-indigo-700">{i + 1}.</span> {steg}
            </li>
          ))}
        </ol>
      </header>

      <Suspense fallback={<BrevStudio />}>
        <StudioMedAnnons searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
