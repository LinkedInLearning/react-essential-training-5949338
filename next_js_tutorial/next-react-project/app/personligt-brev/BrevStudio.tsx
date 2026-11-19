"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BREVSPRAK,
  FOKUS,
  GRANSER,
  KLYSCHOR,
  LANGDER,
  MAX_FOKUS,
  REVISIONER,
  SITUATIONER,
  SPRAKNIVAER,
  STANDARD_INSTALLNINGAR,
  TONER,
  type BrevInstallningar,
  type Matchning,
} from "./_lib/alternativ";

type Props = {
  startUrl?: string;
  startText?: string;
  startTitel?: string;
  startArbetsgivare?: string;
};

type Version = { etikett: string; text: string };
type Arbete = "skriver" | "reviderar" | "analyserar" | null;

const LAGRING = "personligt-brev:v1";

/* ---------- Stilar (samma formspråk som jobbsöket) ---------- */

const kortKlass = "rounded-2xl border-2 border-slate-950 bg-white p-5 shadow-[4px_4px_0_#c7d2fe] sm:p-6";
const faltKlass =
  "w-full min-w-0 rounded-xl border-2 border-slate-950 bg-white px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400 focus-visible:ring-4 focus-visible:ring-indigo-300 disabled:bg-slate-100";
const etikettKlass = "mb-2 block font-semibold text-slate-900";
const primarKnapp =
  "rounded-xl border-2 border-slate-950 bg-yellow-300 px-6 py-3 font-bold text-slate-950 shadow-[3px_3px_0_#0f172a] transition hover:-translate-y-0.5 hover:bg-yellow-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 motion-reduce:transform-none";
const sekundarKnapp =
  "rounded-xl border-2 border-slate-950 bg-white px-4 py-2 font-semibold text-slate-950 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

/* ---------- Hjälpfunktioner ---------- */

async function lasFel(response: Response) {
  const data = (await response.json().catch(() => null)) as { fel?: string } | null;
  return data?.fel ?? `Något gick fel (HTTP ${response.status}).`;
}

async function strommaText(url: string, body: unknown, signal: AbortSignal, onText: (text: string) => void) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) throw new Error(await lasFel(response));

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onText(text);
  }
  return text;
}

function raknaOrd(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function hittaPlatshallare(text: string) {
  return [...new Set(text.match(/\[[^\]\n]{2,150}\]/g) ?? [])];
}

function hittaKlyschor(text: string) {
  const liten = text.toLowerCase();
  return KLYSCHOR.filter((k) => liten.includes(k));
}

function arAvbrott(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

/* ---------- Små byggstenar ---------- */

function Steg({ nummer, titel, children, extra }: { nummer: number; titel: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className={kortKlass} aria-labelledby={`steg-${nummer}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id={`steg-${nummer}`} className="flex min-w-0 items-center gap-3 text-xl font-bold tracking-tight text-slate-950">
          <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-slate-950 bg-yellow-300 text-base">
            {nummer}
          </span>
          {titel}
        </h2>
        {extra}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function ValKnappar<T extends string>({
  legend,
  namn,
  val,
  varde,
  onChange,
  kolumner = "sm:grid-cols-3",
}: {
  legend: string;
  namn: string;
  val: Record<T, { label: string; beskrivning?: string }>;
  varde: T;
  onChange: (v: T) => void;
  kolumner?: string;
}) {
  return (
    <fieldset>
      <legend className={etikettKlass}>{legend}</legend>
      <div className={`grid gap-2 ${kolumner}`}>
        {(Object.entries(val) as [T, { label: string; beskrivning?: string }][]).map(([nyckel, v]) => (
          <label
            key={nyckel}
            className={`flex cursor-pointer flex-col rounded-xl border-2 px-3 py-2.5 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-indigo-300 ${
              varde === nyckel ? "border-slate-950 bg-indigo-600 text-white" : "border-slate-300 bg-white hover:border-slate-950"
            }`}
          >
            <input type="radio" name={namn} value={nyckel} checked={varde === nyckel} onChange={() => onChange(nyckel)} className="sr-only" />
            <span className="font-bold">{v.label}</span>
            {v.beskrivning && (
              <span className={`mt-0.5 text-xs leading-snug ${varde === nyckel ? "text-indigo-100" : "text-slate-500"}`}>{v.beskrivning}</span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Rubrik({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 mt-5 font-bold text-slate-950">{children}</h3>;
}

/* ---------- Huvudkomponent ---------- */

export function BrevStudio({ startUrl = "", startText = "", startTitel = "", startArbetsgivare = "" }: Props) {
  // Annons
  const [annonsUrl, setAnnonsUrl] = useState(startUrl);
  const [annonsText, setAnnonsText] = useState(startText);
  const [annonsInfo, setAnnonsInfo] = useState(
    startTitel ? { titel: startTitel, arbetsgivare: startArbetsgivare } : null,
  );
  const [hamtarAnnons, setHamtarAnnons] = useState(false);
  const [annonsFel, setAnnonsFel] = useState<string | null>(null);

  // CV
  const [cvText, setCvText] = useState("");
  const [cvFilnamn, setCvFilnamn] = useState<string | null>(null);
  const [laddarCv, setLaddarCv] = useState(false);
  const [cvFel, setCvFel] = useState<string | null>(null);
  const [kommIhag, setKommIhag] = useState(false);
  const [drarFil, setDrarFil] = useState(false);

  // Inställningar och resultat
  const [inst, setInst] = useState<BrevInstallningar>(STANDARD_INSTALLNINGAR);
  const [versioner, setVersioner] = useState<Version[]>([]);
  const [aktiv, setAktiv] = useState(0);
  const [arbete, setArbete] = useState<Arbete>(null);
  const [fel, setFel] = useState<string | null>(null);
  const [egenInstruktion, setEgenInstruktion] = useState("");
  const [matchning, setMatchning] = useState<Matchning | null>(null);
  const [kopierad, setKopierad] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const brevRef = useRef<HTMLTextAreaElement>(null);
  const laddat = useRef(false);

  const brev = versioner[aktiv]?.text ?? "";
  const kanSkriva = annonsText.trim().length >= 80 && arbete === null;
  const platshallare = hittaPlatshallare(brev);
  const klyschor = hittaKlyschor(brev);
  const ord = raknaOrd(brev);

  function uppdatera<K extends keyof BrevInstallningar>(nyckel: K, varde: BrevInstallningar[K]) {
    setInst((i) => ({ ...i, [nyckel]: varde }));
  }

  /* --- Spara CV och inställningar lokalt (bara om användaren vill) --- */

  // Läses i en effekt (inte i useState-initieraren) eftersom localStorage inte finns
  // vid serverrendering – annars skulle hydreringen inte matcha. Att sätta state här
  // är avsiktligt och sker bara en gång vid montering.
  useEffect(() => {
    try {
      const sparat = localStorage.getItem(LAGRING);
      if (sparat) {
        const data = JSON.parse(sparat) as { cvText?: string; inst?: Partial<BrevInstallningar> };
        // eslint-disable-next-line react-hooks/set-state-in-effect -- återställer sparad data från localStorage
        setKommIhag(true);
        if (data.cvText) setCvText(data.cvText);
        if (data.inst) setInst({ ...STANDARD_INSTALLNINGAR, ...data.inst, kontaktperson: "", extra: "" });
      }
    } catch {
      // localStorage kan vara blockerat – då fungerar allt utom att komma ihåg.
    }
    laddat.current = true;
  }, []);

  useEffect(() => {
    if (!laddat.current) return;
    try {
      if (kommIhag) {
        // Kontaktperson och extra-text hör till en specifik ansökan och sparas inte.
        const varaktiga = { ...inst, kontaktperson: undefined, extra: undefined }; // undefined tas bort av JSON.stringify
        localStorage.setItem(LAGRING, JSON.stringify({ cvText, inst: varaktiga }));
      } else {
        localStorage.removeItem(LAGRING);
      }
    } catch {
      // Ignorera
    }
  }, [kommIhag, cvText, inst]);

  /* --- Annons --- */

  async function hamtaAnnons(url = annonsUrl) {
    if (!url.trim()) return;
    setHamtarAnnons(true);
    setAnnonsFel(null);
    try {
      const response = await fetch("/api/brev/annons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) throw new Error(await lasFel(response));
      const data = (await response.json()) as { titel: string; arbetsgivare: string; text: string };
      setAnnonsText(data.text);
      setAnnonsInfo({ titel: data.titel, arbetsgivare: data.arbetsgivare });
      setMatchning(null);
    } catch (error) {
      setAnnonsFel(error instanceof Error ? error.message : "Kunde inte hämta annonsen.");
    } finally {
      setHamtarAnnons(false);
    }
  }

  // Kom användaren från jobbsöket? Hämta hela annonsen direkt.
  const autoHamtat = useRef(false);
  useEffect(() => {
    if (startUrl && !autoHamtat.current) {
      autoHamtat.current = true;
      void hamtaAnnons(startUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startUrl]);

  /* --- CV --- */

  async function laddaUppCv(fil: File) {
    setLaddarCv(true);
    setCvFel(null);
    try {
      const formData = new FormData();
      formData.append("fil", fil);
      const response = await fetch("/api/brev/cv", { method: "POST", body: formData });
      if (!response.ok) throw new Error(await lasFel(response));
      const data = (await response.json()) as { text: string; avkortad: boolean };
      setCvText(data.text);
      setCvFilnamn(fil.name);
      setMatchning(null);
      if (data.avkortad) setCvFel("CV:t var väldigt långt och har kortats. Kontrollera att det viktigaste finns med.");
    } catch (error) {
      setCvFel(error instanceof Error ? error.message : "Kunde inte läsa filen.");
    } finally {
      setLaddarCv(false);
    }
  }

  /* --- Skriva och revidera --- */

  async function korBrev(extraBody: Record<string, unknown>, etikett: string, typ: "skriver" | "reviderar") {
    const index = versioner.length;
    const controller = new AbortController();
    abortRef.current = controller;
    setArbete(typ);
    setFel(null);
    setVersioner((v) => [...v, { etikett, text: "" }]);
    setAktiv(index);

    let fick = "";
    try {
      fick = await strommaText(
        "/api/brev",
        { annons: annonsText, cv: cvText, installningar: inst, ...extraBody },
        controller.signal,
        (text) => {
          fick = text;
          setVersioner((v) => v.map((ver, i) => (i === index ? { ...ver, text } : ver)));
        },
      );
    } catch (error) {
      if (!arAvbrott(error)) setFel(error instanceof Error ? error.message : "Något gick fel.");
    } finally {
      // Fick vi ingenting alls tar vi bort den tomma versionen igen.
      if (!fick.trim()) {
        setVersioner((v) => v.filter((_, i) => i !== index));
        setAktiv(Math.max(0, index - 1));
      }
      setArbete(null);
      abortRef.current = null;
    }
  }

  function skriv() {
    void korBrev({}, `Version ${versioner.length + 1}`, "skriver");
  }

  function revidera(revision: keyof typeof REVISIONER | "egen") {
    if (!brev.trim()) return;
    const etikett = revision === "egen" ? "Egen ändring" : REVISIONER[revision].label;
    void korBrev(
      { revision, instruktion: egenInstruktion, nuvarandeBrev: brev },
      etikett,
      "reviderar",
    );
    if (revision === "egen") setEgenInstruktion("");
  }

  function avbryt() {
    abortRef.current?.abort();
  }

  /* --- Matchning --- */

  async function analysera() {
    const controller = new AbortController();
    abortRef.current = controller;
    setArbete("analyserar");
    setFel(null);
    try {
      const response = await fetch("/api/brev/matchning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annons: annonsText, cv: cvText, installningar: inst }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(await lasFel(response));
      setMatchning((await response.json()) as Matchning);
    } catch (error) {
      if (!arAvbrott(error)) setFel(error instanceof Error ? error.message : "Analysen misslyckades.");
    } finally {
      setArbete(null);
      abortRef.current = null;
    }
  }

  /* --- Exportera --- */

  async function kopiera() {
    await navigator.clipboard.writeText(brev);
    setKopierad(true);
    setTimeout(() => setKopierad(false), 2000);
  }

  function laddaNer() {
    const namn = (annonsInfo?.arbetsgivare || "ansokan").toLowerCase().replace(/[^a-z0-9åäö]+/gi, "-").replace(/^-|-$/g, "");
    const url = URL.createObjectURL(new Blob([brev], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `personligt-brev-${namn || "ansokan"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function markera(text: string) {
    const falt = brevRef.current;
    const start = brev.indexOf(text);
    if (!falt || start === -1) return;
    falt.focus();
    falt.setSelectionRange(start, start + text.length);
  }

  const statusText =
    arbete === "skriver" ? "Skriver ditt brev…" :
    arbete === "reviderar" ? "Skriver om brevet…" :
    arbete === "analyserar" ? "Analyserar matchningen…" : "";

  /* ---------- Rendering ---------- */

  return (
    <>
      <div className="mt-10 grid items-start gap-8 lg:grid-cols-2 print:hidden">
        {/* ===== Vänster: underlag ===== */}
        <div className="min-w-0 space-y-8">
          <Steg nummer={1} titel="Annonsen">
            <div>
              <label htmlFor="annons-url" className={etikettKlass}>Länk till annonsen</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="annons-url"
                  type="url"
                  inputMode="url"
                  value={annonsUrl}
                  onChange={(e) => setAnnonsUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void hamtaAnnons();
                    }
                  }}
                  placeholder="https://arbetsformedlingen.se/platsbanken/annonser/…"
                  className={`${faltKlass} flex-1`}
                />
                <button type="button" onClick={() => void hamtaAnnons()} disabled={hamtarAnnons || !annonsUrl.trim()} className={sekundarKnapp}>
                  {hamtarAnnons ? "Hämtar…" : "Hämta annons"}
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-500">Fungerar med Platsbanken och de flesta jobbsajter. Annars – klistra in texten nedan.</p>
              {annonsFel && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{annonsFel}</p>}
            </div>

            {annonsInfo && (annonsInfo.titel || annonsInfo.arbetsgivare) && (
              <p className="rounded-xl border-2 border-slate-950 bg-indigo-50 px-4 py-3 text-sm">
                <span className="font-bold">✓ {annonsInfo.titel}</span>
                {annonsInfo.arbetsgivare && <span className="text-slate-600"> · {annonsInfo.arbetsgivare}</span>}
              </p>
            )}

            <div>
              <label htmlFor="annons-text" className={etikettKlass}>Annonstext</label>
              <textarea
                id="annons-text"
                rows={8}
                maxLength={GRANSER.annons}
                value={annonsText}
                onChange={(e) => {
                  setAnnonsText(e.target.value);
                  setMatchning(null);
                }}
                placeholder="Klistra in hela annonsen här – särskilt kraven och beskrivningen av tjänsten."
                className={`${faltKlass} resize-y text-sm leading-relaxed`}
              />
              <p className="mt-1 text-right text-xs text-slate-500">
                {annonsText.length.toLocaleString("sv-SE")} / {GRANSER.annons.toLocaleString("sv-SE")} tecken
              </p>
            </div>
          </Steg>

          <Steg nummer={2} titel="Ditt CV" extra={<span className="text-sm font-medium text-slate-500">Valfritt men rekommenderas</span>}>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDrarFil(true);
              }}
              onDragLeave={() => setDrarFil(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrarFil(false);
                const fil = e.dataTransfer.files[0];
                if (fil) void laddaUppCv(fil);
              }}
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-indigo-300 ${
                drarFil ? "border-indigo-600 bg-indigo-50" : "border-slate-400 hover:border-slate-950 hover:bg-slate-50"
              }`}
            >
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="sr-only"
                onChange={(e) => {
                  const fil = e.target.files?.[0];
                  if (fil) void laddaUppCv(fil);
                  e.target.value = "";
                }}
              />
              <span className="text-2xl" aria-hidden="true">📄</span>
              <span className="font-bold text-slate-950">
                {laddarCv ? "Läser ditt CV…" : cvFilnamn ? `✓ ${cvFilnamn}` : "Välj fil eller dra hit den"}
              </span>
              <span className="text-sm text-slate-500">PDF, Word (.docx) eller text · max 5 MB</span>
            </label>
            {cvFel && <p role="alert" className="text-sm font-semibold text-red-700">{cvFel}</p>}

            <div>
              <label htmlFor="cv-text" className={etikettKlass}>
                CV-text <span className="font-normal text-slate-500">(kan redigeras eller klistras in)</span>
              </label>
              <textarea
                id="cv-text"
                rows={cvText ? 8 : 4}
                maxLength={GRANSER.cv}
                value={cvText}
                onChange={(e) => {
                  setCvText(e.target.value);
                  setMatchning(null);
                }}
                placeholder="Texten från ditt CV hamnar här. Du kan också klistra in den direkt."
                className={`${faltKlass} resize-y text-sm leading-relaxed`}
              />
            </div>

            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={kommIhag} onChange={(e) => setKommIhag(e.target.checked)} className="mt-0.5 size-5 accent-indigo-600" />
              <span>
                <span className="font-semibold text-slate-900">Kom ihåg mitt CV och mina val på den här enheten</span>
                <span className="block text-slate-500">Sparas bara i din webbläsare, inte på vår server.</span>
              </span>
            </label>

            <p className="rounded-xl bg-slate-100 p-3 text-xs leading-relaxed text-slate-600">
              🔒 CV och annons skickas till en AI-tjänst för att skriva brevet och sparas inte av oss. Ta gärna bort personnummer,
              adress och annat som inte behövs innan du fortsätter.
            </p>
          </Steg>

          <Steg nummer={3} titel="Stil och innehåll">
            <ValKnappar legend="Brevets språk" namn="sprak" val={BREVSPRAK} varde={inst.sprak} onChange={(v) => uppdatera("sprak", v)} kolumner="grid-cols-2" />
            <ValKnappar legend="Språknivå" namn="niva" val={SPRAKNIVAER} varde={inst.niva} onChange={(v) => uppdatera("niva", v)} />
            <ValKnappar legend="Ton" namn="ton" val={TONER} varde={inst.ton} onChange={(v) => uppdatera("ton", v)} kolumner="grid-cols-2 sm:grid-cols-3" />
            <ValKnappar legend="Längd" namn="langd" val={LANGDER} varde={inst.langd} onChange={(v) => uppdatera("langd", v)} />

            <div>
              <label htmlFor="situation" className={etikettKlass}>Din situation</label>
              <select
                id="situation"
                value={inst.situation}
                onChange={(e) => uppdatera("situation", e.target.value as BrevInstallningar["situation"])}
                className={faltKlass}
              >
                {Object.entries(SITUATIONER).map(([nyckel, v]) => (
                  <option key={nyckel} value={nyckel}>{v.label}</option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className={etikettKlass}>
                Vad ska lyftas fram? <span className="font-normal text-slate-500">(välj upp till {MAX_FOKUS})</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(FOKUS) as [keyof typeof FOKUS, (typeof FOKUS)[keyof typeof FOKUS]][]).map(([nyckel, v]) => {
                  const vald = inst.fokus.includes(nyckel);
                  const fullt = !vald && inst.fokus.length >= MAX_FOKUS;
                  return (
                    <button
                      key={nyckel}
                      type="button"
                      aria-pressed={vald}
                      disabled={fullt}
                      onClick={() => uppdatera("fokus", vald ? inst.fokus.filter((f) => f !== nyckel) : [...inst.fokus, nyckel])}
                      className={`rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        vald ? "border-slate-950 bg-indigo-600 text-white" : "border-slate-300 bg-white hover:border-slate-950"
                      }`}
                    >
                      {vald && <span aria-hidden="true">✓ </span>}
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="namn" className={etikettKlass}>Ditt namn</label>
                <input id="namn" value={inst.namn} maxLength={GRANSER.namn} onChange={(e) => uppdatera("namn", e.target.value)} placeholder="För underskriften" className={faltKlass} />
              </div>
              <div>
                <label htmlFor="kontakt" className={etikettKlass}>
                  Kontaktperson <span className="font-normal text-slate-500">(valfritt)</span>
                </label>
                <input id="kontakt" value={inst.kontaktperson} maxLength={GRANSER.namn} onChange={(e) => uppdatera("kontaktperson", e.target.value)} placeholder="T.ex. Anna" className={faltKlass} />
              </div>
            </div>

            <div>
              <label htmlFor="extra" className={etikettKlass}>
                Något mer AI:n borde veta? <span className="font-normal text-slate-500">(valfritt)</span>
              </label>
              <textarea
                id="extra"
                rows={3}
                maxLength={GRANSER.extra}
                value={inst.extra}
                onChange={(e) => uppdatera("extra", e.target.value)}
                placeholder="T.ex. varför du vill jobba just där, ett projekt du är stolt över, att du har B-körkort eller kan börja direkt."
                className={`${faltKlass} resize-y text-sm`}
              />
              <p className="mt-1 text-sm text-slate-500">Det här är ofta det som gör brevet personligt på riktigt.</p>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
              <button type="button" onClick={skriv} disabled={!kanSkriva} className={primarKnapp}>
                {versioner.length ? "Skriv ett nytt brev" : "Skriv mitt personliga brev"} <span aria-hidden="true">✍️</span>
              </button>
              {arbete && (
                <button type="button" onClick={avbryt} className={sekundarKnapp}>Avbryt</button>
              )}
              {!annonsText.trim() && <p className="text-sm text-slate-500">Lägg till annonsen först.</p>}
            </div>
          </Steg>
        </div>

        {/* ===== Höger: resultat ===== */}
        <div className="min-w-0 space-y-8 lg:sticky lg:top-6">
          <section className={kortKlass} aria-labelledby="resultat-rubrik">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 id="resultat-rubrik" className="text-xl font-bold tracking-tight text-slate-950">Ditt brev</h2>
              <p role="status" aria-live="polite" className="text-sm font-semibold text-indigo-700">{statusText}</p>
            </div>

            {fel && <p role="alert" className="mb-4 rounded-xl border-2 border-red-700 bg-red-50 p-3 text-sm font-semibold text-red-800">{fel}</p>}

            {versioner.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-300 p-6 text-slate-600">
                <p className="font-semibold text-slate-900">Här dyker ditt brev upp.</p>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
                  <li>Bifoga ditt CV – då kan brevet bygga på riktiga exempel.</li>
                  <li>Skriv några rader om varför du vill ha just det här jobbet.</li>
                  <li>
                    Står det något i <code className="rounded bg-slate-100 px-1">[hakparentes]</code> i brevet saknades info – fyll i det själv.
                  </li>
                </ul>
              </div>
            ) : (
              <>
                {versioner.length > 1 && (
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Versioner">
                    {versioner.map((v, i) => (
                      <button
                        key={i}
                        type="button"
                        role="tab"
                        aria-selected={i === aktiv}
                        disabled={arbete !== null}
                        onClick={() => setAktiv(i)}
                        className={`shrink-0 rounded-lg border-2 px-3 py-1 text-sm font-semibold ${
                          i === aktiv ? "border-slate-950 bg-yellow-300" : "border-slate-300 bg-white hover:border-slate-950"
                        }`}
                      >
                        {i + 1}. {v.etikett}
                      </button>
                    ))}
                  </div>
                )}

                <label htmlFor="brev" className="sr-only">Brevtext (kan redigeras)</label>
                <textarea
                  id="brev"
                  ref={brevRef}
                  rows={16}
                  value={brev}
                  readOnly={arbete === "skriver" || arbete === "reviderar"}
                  onChange={(e) => setVersioner((v) => v.map((ver, i) => (i === aktiv ? { ...ver, text: e.target.value } : ver)))}
                  className={`${faltKlass} resize-y font-serif text-[15px] leading-relaxed`}
                />

                <p className="mt-2 text-sm text-slate-600">
                  {ord} ord · ca {Math.max(1, Math.ceil(ord / 420))} A4-sida · Du kan redigera texten direkt.
                </p>

                {/* Kvalitetskoll */}
                {arbete === null && (platshallare.length > 0 || klyschor.length > 0) && (
                  <div className="mt-4 space-y-3 rounded-xl border-2 border-slate-950 bg-yellow-50 p-4 text-sm">
                    {platshallare.length > 0 && (
                      <div>
                        <p className="font-bold text-slate-950">Fyll i innan du skickar ({platshallare.length}):</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {platshallare.map((p) => (
                            <button key={p} type="button" onClick={() => markera(p)} className="rounded-lg border-2 border-slate-950 bg-white px-2 py-1 text-left text-xs font-semibold hover:bg-yellow-200">
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {klyschor.length > 0 && (
                      <p>
                        <span className="font-bold text-slate-950">Klyschvarning: </span>
                        {klyschor.map((k) => `”${k}”`).join(", ")} – byt mot ett konkret exempel eller tryck på ”Ta bort klyschor”.
                      </p>
                    )}
                  </div>
                )}

                {/* Snabbändringar */}
                <div className="mt-5">
                  <h3 className="mb-2 font-bold text-slate-950">Justera brevet</h3>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(REVISIONER) as [keyof typeof REVISIONER, { label: string }][]).map(([nyckel, v]) => (
                      <button key={nyckel} type="button" disabled={arbete !== null || !brev.trim()} onClick={() => revidera(nyckel)} className={`${sekundarKnapp} px-3 py-1.5 text-sm`}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                  <form
                    className="mt-3 flex flex-col gap-2 sm:flex-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (egenInstruktion.trim()) revidera("egen");
                    }}
                  >
                    <label htmlFor="egen" className="sr-only">Egen ändring</label>
                    <input
                      id="egen"
                      value={egenInstruktion}
                      maxLength={GRANSER.instruktion}
                      onChange={(e) => setEgenInstruktion(e.target.value)}
                      placeholder="Egen ändring, t.ex. ”nämn att jag kan börja i januari”"
                      className={`${faltKlass} flex-1 py-2 text-sm`}
                    />
                    <button type="submit" disabled={arbete !== null || !egenInstruktion.trim() || !brev.trim()} className={`${sekundarKnapp} text-sm`}>
                      Ändra
                    </button>
                  </form>
                </div>

                {/* Exportera */}
                <div className="mt-5 grid grid-cols-2 gap-3 border-t-2 border-slate-100 pt-5 sm:flex sm:flex-wrap [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
                  <button type="button" onClick={() => void kopiera()} disabled={!brev || arbete !== null} className={primarKnapp}>
                    {kopierad ? "Kopierat ✓" : "Kopiera"}
                  </button>
                  <button type="button" onClick={laddaNer} disabled={!brev || arbete !== null} className={sekundarKnapp}>Ladda ner .txt</button>
                  <button type="button" onClick={() => window.print()} disabled={!brev || arbete !== null} className={sekundarKnapp}>Skriv ut / PDF</button>
                </div>
                <p className="mt-3 text-xs text-slate-500">Läs alltid igenom brevet innan du skickar det – AI kan missuppfatta saker.</p>
              </>
            )}
          </section>

          {/* Matchningsanalys */}
          <section className={kortKlass} aria-labelledby="matchning-rubrik">
            <h2 id="matchning-rubrik" className="text-xl font-bold tracking-tight text-slate-950">Hur väl matchar du?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Jämför ditt CV med annonsens krav, krav för krav. Du får också tips och troliga intervjufrågor.
            </p>
            <button
              type="button"
              onClick={() => void analysera()}
              disabled={arbete !== null || cvText.trim().length < 50 || annonsText.trim().length < 80}
              className={`${sekundarKnapp} mt-4`}
            >
              {arbete === "analyserar" ? "Analyserar…" : matchning ? "Analysera igen" : "Analysera matchning"}
            </button>
            {cvText.trim().length < 50 && <p className="mt-2 text-sm text-slate-500">Kräver att du lagt till ditt CV.</p>}

            {matchning && <MatchningsVy matchning={matchning} brev={brev} />}
          </section>
        </div>
      </div>

      {/* Endast vid utskrift: själva brevet */}
      <div className="hidden whitespace-pre-wrap font-serif text-[12pt] leading-relaxed text-black print:block">{brev}</div>
    </>
  );
}

/* ---------- Matchningsresultat ---------- */

const STATUS = {
  uppfyllt: { text: "Uppfyllt", ikon: "✓", klass: "bg-emerald-100 text-emerald-900 border-emerald-700" },
  delvis: { text: "Delvis", ikon: "◐", klass: "bg-yellow-100 text-yellow-900 border-yellow-700" },
  saknas: { text: "Saknas", ikon: "✗", klass: "bg-red-100 text-red-900 border-red-700" },
} as const;

function MatchningsVy({ matchning, brev }: { matchning: Matchning; brev: string }) {
  const antal = { uppfyllt: 0, delvis: 0, saknas: 0 };
  for (const k of matchning.krav) antal[k.status]++;
  const brevLiten = brev.toLowerCase();

  return (
    <div className="mt-5 border-t-2 border-slate-100 pt-5">
      {matchning.sammanfattning && <p className="leading-relaxed text-slate-800">{matchning.sammanfattning}</p>}

      {matchning.krav.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
            {(Object.keys(STATUS) as (keyof typeof STATUS)[]).map((s) => (
              <span key={s} className={`rounded-full border-2 px-3 py-1 ${STATUS[s].klass}`}>
                {STATUS[s].ikon} {antal[s]} {STATUS[s].text.toLowerCase()}
              </span>
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {matchning.krav.map((k, i) => (
              <li key={i} className="rounded-xl border-2 border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-950">
                    {k.krav}
                    {k.typ === "meriterande" && <span className="ml-2 text-xs font-medium text-slate-500">meriterande</span>}
                  </p>
                  <span className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-bold ${STATUS[k.status].klass}`}>
                    <span aria-hidden="true">{STATUS[k.status].ikon} </span>
                    {STATUS[k.status].text}
                  </span>
                </div>
                {k.belagg && <p className="mt-1 text-sm text-slate-600">{k.belagg}</p>}
              </li>
            ))}
          </ul>
        </>
      )}

      {matchning.styrkor.length > 0 && (
        <>
          <Rubrik>Dina styrkor för jobbet</Rubrik>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {matchning.styrkor.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </>
      )}

      {matchning.tips.length > 0 && (
        <>
          <Rubrik>Tips för ansökan</Rubrik>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {matchning.tips.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </>
      )}

      {matchning.nyckelord.length > 0 && (
        <>
          <Rubrik>Nyckelord från annonsen</Rubrik>
          <p className="mb-2 text-xs text-slate-500">Gröna finns redan i ditt brev.</p>
          <div className="flex flex-wrap gap-2">
            {matchning.nyckelord.map((ord) => {
              const finns = brevLiten.includes(ord.toLowerCase());
              return (
                <span key={ord} className={`rounded-full border-2 px-3 py-1 text-xs font-semibold ${finns ? "border-emerald-700 bg-emerald-100 text-emerald-900" : "border-slate-300 bg-white text-slate-700"}`}>
                  {finns && <span aria-label="finns i brevet">✓ </span>}
                  {ord}
                </span>
              );
            })}
          </div>
        </>
      )}

      {matchning.intervjufragor.length > 0 && (
        <>
          <Rubrik>Förbered dig: troliga intervjufrågor</Rubrik>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
            {matchning.intervjufragor.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </>
      )}
    </div>
  );
}
