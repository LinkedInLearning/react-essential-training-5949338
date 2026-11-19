"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

const MAX_TRAFFAR = 100;

function normalisera(text) {
  return text.toLocaleLowerCase("sv").trim();
}

// Yrken som börjar på söktexten kommer först. Från tre tecken visas även yrken
// där något ord börjar på söktexten, t.ex. "sjuk" → "Grundutbildade sjuksköterskor".
function filtrera(yrken, sokText) {
  const q = normalisera(sokText);
  if (!q) return yrken;

  const borjarMed = [];
  const ordBorjarMed = [];
  for (const yrke of yrken) {
    const namn = normalisera(yrke.namn);
    if (namn.startsWith(q)) borjarMed.push(yrke);
    else if (q.length >= 3 && namn.split(/[\s,\-–/()]+/).some((ord) => ord.startsWith(q))) {
      ordBorjarMed.push(yrke);
    }
  }
  return [...borjarMed, ...ordBorjarMed];
}

export function YrkesVal({ yrken, startKod, faltKlass }) {
  const startYrke = yrken.find((y) => y.kod === startKod) ?? yrken[0];
  const [valt, setValt] = useState(startYrke);
  const [text, setText] = useState(startYrke?.namn ?? "");
  const [oppen, setOppen] = useState(false);
  const [aktiv, setAktiv] = useState(0);
  const [harSkrivit, setHarSkrivit] = useState(false);
  const rotRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();
  const inputId = useId();

  // Visa hela listan när fältet just öppnats, filtrera först när man skriver.
  const traffar = useMemo(
    () => (harSkrivit ? filtrera(yrken, text) : yrken),
    [yrken, text, harSkrivit],
  );
  const synliga = traffar.slice(0, MAX_TRAFFAR);

  function oppna() {
    setHarSkrivit(false);
    setAktiv(Math.max(0, yrken.findIndex((y) => y.kod === valt?.kod)));
    setOppen(true);
  }

  function valj(yrke) {
    setValt(yrke);
    setText(yrke.namn);
    setOppen(false);
    setHarSkrivit(false);
  }

  function stang() {
    setOppen(false);
    setHarSkrivit(false);
    setText(valt?.namn ?? "");
  }

  // Stäng vid klick utanför och återställ texten till det valda yrket.
  useEffect(() => {
    if (!oppen) return;
    function klick(event) {
      if (!rotRef.current?.contains(event.target)) stang();
    }
    document.addEventListener("pointerdown", klick);
    return () => document.removeEventListener("pointerdown", klick);
  });

  // Håll det markerade alternativet synligt vid piltangenter.
  useEffect(() => {
    if (!oppen) return;
    listRef.current
      ?.querySelector(`[data-index="${aktiv}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [aktiv, oppen]);

  function tangent(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!oppen) return oppna();
      setAktiv((i) => Math.min(i + 1, synliga.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!oppen) return oppna();
      setAktiv((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && oppen) {
      event.preventDefault();
      if (synliga[aktiv]) valj(synliga[aktiv]);
    } else if (event.key === "Escape" && oppen) {
      event.preventDefault();
      stang();
    } else if (event.key === "Tab" && oppen) {
      stang();
    }
  }

  return (
    <div ref={rotRef} className="relative">
      <input type="hidden" name="yrke" value={valt?.kod ?? ""} />

      <label htmlFor={inputId} className="mb-2 block font-semibold text-white">
        Vilket yrke vill du kolla?
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={oppen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={oppen && synliga[aktiv] ? `${listId}-${synliga[aktiv].kod}` : undefined}
          autoComplete="off"
          spellCheck={false}
          value={text}
          placeholder="Skriv till exempel psykolog eller lärare"
          onFocus={(e) => {
            e.target.select();
            if (!oppen) oppna();
          }}
          onClick={() => !oppen && oppna()}
          onChange={(e) => {
            setText(e.target.value);
            setHarSkrivit(true);
            setAktiv(0);
            setOppen(true);
          }}
          onKeyDown={tangent}
          className={`${faltKlass} pr-12 placeholder:text-slate-500`}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={oppen ? "Stäng yrkeslistan" : "Visa alla yrken"}
          onClick={() => {
            if (oppen) stang();
            else {
              oppna();
              inputRef.current?.focus();
            }
          }}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center text-xl font-bold text-slate-950"
        >
          <span aria-hidden="true" className={`transition-transform ${oppen ? "rotate-180" : ""}`}>⌄</span>
        </button>
      </div>

      {oppen && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border-2 border-slate-950 bg-white text-slate-950 shadow-[6px_6px_0_#0f172a]">
          {synliga.length === 0 ? (
            <p className="px-5 py-4 text-slate-600">
              Inga yrken matchar ”{text.trim()}”. Prova ett kortare eller annat ord.
            </p>
          ) : (
            <ul ref={listRef} id={listId} role="listbox" aria-label="Yrken" className="max-h-80 overflow-y-auto overscroll-contain py-2">
              {synliga.map((yrke, index) => {
                const markerad = index === aktiv;
                const vald = yrke.kod === valt?.kod;
                return (
                  <li
                    key={yrke.kod}
                    id={`${listId}-${yrke.kod}`}
                    data-index={index}
                    role="option"
                    aria-selected={vald}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => valj(yrke)}
                    onPointerMove={() => setAktiv(index)}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-5 py-2.5 ${
                      markerad ? "bg-indigo-600 text-white" : ""
                    }`}
                  >
                    <span className={vald ? "font-bold" : ""}>{yrke.namn}</span>
                    {vald && <span aria-hidden="true">✓</span>}
                  </li>
                );
              })}
            </ul>
          )}
          {traffar.length > MAX_TRAFFAR && (
            <p className="border-t-2 border-slate-200 bg-slate-50 px-5 py-2 text-sm text-slate-600">
              Visar {MAX_TRAFFAR} av {traffar.length} yrken – skriv mer för att begränsa.
            </p>
          )}
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {oppen && harSkrivit ? `${traffar.length} yrken matchar` : ""}
      </p>
    </div>
  );
}
