"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Lan } from "./geografi";

type Props = {
  lan: Lan[];
  valdaLan: string[];
  valdaKommuner: string[];
};

export function OrtFilter({ lan, valdaLan: startLan, valdaKommuner: startKommuner }: Props) {
  const [oppen, setOppen] = useState(false);
  const [aktivtLanId, setAktivtLanId] = useState(lan[0]?.id);
  // Mobil: visa en kolumn i taget (län → kommuner). Dator visar båda sida vid sida.
  const [mobilVy, setMobilVy] = useState<"lan" | "kommuner">("lan");
  const [valdaLan, setValdaLan] = useState(() => new Set(startLan));
  const [valdaKommuner, setValdaKommuner] = useState(() => new Set(startKommuner));
  const rotRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Stäng panelen vid klick utanför eller Escape.
  useEffect(() => {
    if (!oppen) return;

    function klick(event: PointerEvent) {
      if (!rotRef.current?.contains(event.target as Node)) setOppen(false);
    }
    function tangent(event: KeyboardEvent) {
      if (event.key === "Escape") setOppen(false);
    }

    document.addEventListener("pointerdown", klick);
    document.addEventListener("keydown", tangent);
    // Lås sidan bakom bottenarket på mobil.
    const mobil = window.matchMedia("(max-width: 639px)").matches;
    const tidigare = document.body.style.overflow;
    if (mobil) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("pointerdown", klick);
      document.removeEventListener("keydown", tangent);
      document.body.style.overflow = tidigare;
    };
  }, [oppen]);

  const aktivtLan = lan.find((l) => l.id === aktivtLanId) ?? lan[0];
  const antalVal = valdaLan.size + valdaKommuner.size;

  function antalValdaI(l: Lan) {
    if (valdaLan.has(l.id)) return l.kommuner.length;
    return l.kommuner.filter((k) => valdaKommuner.has(k.id)).length;
  }

  function vaxlaHelaLanet(l: Lan) {
    const nyaLan = new Set(valdaLan);
    const nyaKommuner = new Set(valdaKommuner);
    for (const k of l.kommuner) nyaKommuner.delete(k.id);

    if (nyaLan.has(l.id)) nyaLan.delete(l.id);
    else nyaLan.add(l.id);

    setValdaLan(nyaLan);
    setValdaKommuner(nyaKommuner);
  }

  function vaxlaKommun(l: Lan, kommunId: string) {
    const nyaLan = new Set(valdaLan);
    const nyaKommuner = new Set(valdaKommuner);

    if (nyaLan.has(l.id)) {
      // Hela länet var valt: välj bort den här kommunen men behåll resten.
      nyaLan.delete(l.id);
      for (const k of l.kommuner) if (k.id !== kommunId) nyaKommuner.add(k.id);
    } else if (nyaKommuner.has(kommunId)) {
      nyaKommuner.delete(kommunId);
    } else {
      nyaKommuner.add(kommunId);
      // Alla kommuner i länet ikryssade → spara som hela länet i stället.
      if (l.kommuner.every((k) => nyaKommuner.has(k.id))) {
        nyaLan.add(l.id);
        for (const k of l.kommuner) nyaKommuner.delete(k.id);
      }
    }

    setValdaLan(nyaLan);
    setValdaKommuner(nyaKommuner);
  }

  function rensaAllt() {
    setValdaLan(new Set());
    setValdaKommuner(new Set());
  }

  function rensaLanet(l: Lan) {
    const nyaLan = new Set(valdaLan);
    const nyaKommuner = new Set(valdaKommuner);
    nyaLan.delete(l.id);
    for (const k of l.kommuner) nyaKommuner.delete(k.id);
    setValdaLan(nyaLan);
    setValdaKommuner(nyaKommuner);
  }

  const doldaFalt = (
    <>
      {[...valdaLan].map((id) => <input key={`lan-${id}`} type="hidden" name="lan" value={id} />)}
      {[...valdaKommuner].map((id) => <input key={`kommun-${id}`} type="hidden" name="kommun" value={id} />)}
    </>
  );

  if (lan.length === 0) {
    return (
      <>
        {doldaFalt}
        <button type="button" disabled className="rounded-xl border-2 border-white/40 px-5 py-3 font-bold text-indigo-100">
          Ort (laddar…)
        </button>
      </>
    );
  }

  return (
    <div ref={rotRef} className="relative">
      {/* De dolda fälten är det som faktiskt skickas med formuläret: ?lan=...&kommun=... */}
      {doldaFalt}

      <button
        type="button"
        aria-expanded={oppen}
        aria-controls={panelId}
        onClick={() => {
          setMobilVy("lan");
          setOppen((v) => !v);
        }}
        className="inline-flex w-full items-center justify-center gap-3 sm:w-auto rounded-xl border-2 border-slate-950 bg-white px-5 py-3 font-bold text-slate-950 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        Ort
        {antalVal > 0 && (
          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">{antalVal}</span>
        )}
        <span aria-hidden="true" className={`transition-transform ${oppen ? "rotate-180" : ""}`}>⌄</span>
      </button>

      {oppen && aktivtLan && (
        <>
        {/* Mörk bakgrund bakom bottenarket (endast mobil) */}
        <div aria-hidden="true" onClick={() => setOppen(false)} className="fixed inset-0 z-40 bg-slate-950/50 sm:hidden" />
        <div
          id={panelId}
          role="dialog"
          aria-label="Välj ort"
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl border-2 border-b-0 border-slate-950 bg-white text-slate-950 shadow-[0_-6px_0_#0f172a] sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:z-20 sm:mt-2 sm:block sm:max-h-none sm:w-[min(48rem,calc(100vw-4rem))] sm:rounded-2xl sm:border-b-2 sm:shadow-[6px_6px_0_#0f172a]"
        >
          {/* Draghandtag – visuell markör för bottenark */}
          <div aria-hidden="true" className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-slate-300 sm:hidden" />
          <div className="grid min-h-0 flex-1 sm:grid-cols-2">
            {/* Vänster kolumn: län */}
            <div className={`min-h-0 flex-col sm:flex sm:border-r-2 sm:border-slate-200 ${mobilVy === "lan" ? "flex" : "hidden"}`}>
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                <h3 className="text-lg font-bold">Län</h3>
                <button type="button" onClick={rensaAllt} className="text-sm font-semibold text-red-700 underline">
                  Rensa
                </button>
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2 sm:max-h-80 sm:flex-none">
                {lan.map((l) => {
                  const antal = antalValdaI(l);
                  const aktiv = l.id === aktivtLan.id;
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        aria-pressed={aktiv}
                        onClick={() => {
                          setAktivtLanId(l.id);
                          setMobilVy("kommuner");
                        }}
                        className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left sm:py-2.5 ${aktiv ? "bg-indigo-600 text-white" : "hover:bg-indigo-50"}`}
                      >
                        <span>
                          {l.namn}
                          {antal > 0 && <span className="ml-2 text-sm font-semibold">({antal})</span>}
                        </span>
                        <span aria-hidden="true">›</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Höger kolumn: kommuner i det aktiva länet */}
            <fieldset className={`min-h-0 min-w-0 flex-col sm:flex ${mobilVy === "kommuner" ? "flex" : "hidden"}`}>
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMobilVy("lan")}
                    className="-ml-2 shrink-0 rounded-lg px-2 py-1 text-lg font-bold hover:bg-indigo-50 sm:hidden"
                  >
                    <span aria-hidden="true">‹</span>
                    <span className="sr-only">Tillbaka till län</span>
                  </button>
                  <legend className="float-left truncate text-lg font-bold">
                    <span className="sm:hidden">{aktivtLan.namn}</span>
                    <span className="hidden sm:inline">Kommuner</span>
                  </legend>
                </div>
                <button type="button" onClick={() => rensaLanet(aktivtLan)} className="text-sm font-semibold text-red-700 underline">
                  Rensa
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-5 py-3 sm:max-h-80 sm:flex-none">
                <label className="flex cursor-pointer items-center gap-3 py-1.5 font-semibold">
                  <input
                    type="checkbox"
                    className="size-5 accent-indigo-600"
                    checked={valdaLan.has(aktivtLan.id)}
                    ref={(el) => {
                      if (el) {
                        const n = antalValdaI(aktivtLan);
                        el.indeterminate = n > 0 && n < aktivtLan.kommuner.length;
                      }
                    }}
                    onChange={() => vaxlaHelaLanet(aktivtLan)}
                  />
                  Välj alla kommuner
                </label>
                <hr className="my-2 border-slate-200" />
                {aktivtLan.kommuner.map((k) => (
                  <label key={k.id} className="flex cursor-pointer items-center gap-3 py-1.5">
                    <input
                      type="checkbox"
                      className="size-5 accent-indigo-600"
                      checked={valdaLan.has(aktivtLan.id) || valdaKommuner.has(k.id)}
                      onChange={() => vaxlaKommun(aktivtLan, k.id)}
                    />
                    {k.namn}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t-2 border-slate-200 bg-slate-50 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => setOppen(false)} className="px-4 py-2 font-semibold underline">
              Stäng
            </button>
            <button type="submit" className="flex-1 rounded-xl border-2 border-slate-950 bg-yellow-300 px-5 py-2 font-bold hover:bg-yellow-200 sm:flex-none">
              Visa jobb{antalVal > 0 && ` (${antalVal})`}
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
