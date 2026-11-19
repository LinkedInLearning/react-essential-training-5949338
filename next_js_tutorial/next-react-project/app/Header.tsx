"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

const LINKS = [
  { href: "/", label: "Översikt" },
  { href: "/nyheter", label: "Nyheter" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobb", label: "Sök Jobb" },
  { href: "/personligt-brev", label: "Personligt Brev" },
  { href: "/loner", label: "Lönekollen" },
  { href: "/kontakt", label: "Kontakta Oss" },
];

export default function Header() {
  const pathname = usePathname();
  const menuId = useId();
  // Menyn hör ihop med sidan den öppnades på – navigerar man stängs den automatiskt.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  // Stäng med Escape och lås scroll bakom den öppna menyn.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenOn(null);
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const desktopLinkClass = (href: string) =>
    `rounded px-3 py-1 whitespace-nowrap ${isActive(href) ? "bg-indigo-600 text-white border-1 text-lg shadow-[2px_3px_0_#000]" : "text-base"
    }`;

  const mobileLinkClass = (href: string) =>
    `flex items-center justify-between rounded-xl border-2 px-4 py-3 text-lg font-bold transition-colors ${isActive(href)
      ? "border-slate-950 bg-indigo-600 text-white shadow-[3px_3px_0_#0f172a]"
      : "border-transparent text-slate-950 hover:border-slate-950 hover:bg-yellow-300"
    }`;

  return (
    <header className="relative z-40 bg-yellow-400 py-3 border-b-2 xl:py-4">
      <div className="container px-4">
        <nav aria-label="Huvudmeny" className="flex items-center justify-between gap-4 py-2 xl:justify-start xl:px-4">
          <Link href="/" className="inline-flex shrink-0 items-center gap-2.5">
            <span className="text-2xl font-extrabold leading-none tracking-tight text-slate-900">
              Work<span className="text-indigo-600">Hunter</span>
            </span>
          </Link>

          {/* Dator: alla länkar på en rad */}
          <ul className="hidden items-center gap-4 xl:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={desktopLinkClass(link.href)}
                >
                  <span className="text-lg font-bold">{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Mobil/surfplatta: hamburgermeny */}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpenOn(open ? null : pathname)}
            className="inline-flex size-11 items-center justify-center rounded-xl border-2 border-slate-950 bg-white shadow-[2px_2px_0_#0f172a] transition active:translate-y-0.5 active:shadow-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 xl:hidden"
          >
            <span className="sr-only">{open ? "Stäng meny" : "Öppna meny"}</span>
            <span aria-hidden="true" className="relative block h-4 w-5">
              <span className={`absolute left-0 h-0.5 w-5 rounded bg-slate-950 transition-all ${open ? "top-[7px] rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 top-[7px] h-0.5 w-5 rounded bg-slate-950 transition-opacity ${open ? "opacity-0" : ""}`} />
              <span className={`absolute left-0 h-0.5 w-5 rounded bg-slate-950 transition-all ${open ? "top-[7px] -rotate-45" : "top-[14px]"}`} />
            </span>
          </button>
        </nav>
      </div>

      {open && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setOpenOn(null)}
            className="absolute inset-x-0 top-full z-30 h-dvh bg-slate-950/40 xl:hidden"
          />
          <div
            id={menuId}
            className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-5rem)] overflow-y-auto border-b-2 border-slate-950 bg-yellow-400 px-4 pb-5 pt-2 xl:hidden"
          >
            <ul className="mx-auto flex max-w-md flex-col gap-1.5">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive(link.href) ? "page" : undefined}
                    onClick={() => setOpenOn(null)}
                    className={mobileLinkClass(link.href)}
                  >
                    {link.label}
                    <span aria-hidden="true">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </header>
  );
}
