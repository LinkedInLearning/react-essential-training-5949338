// POST /api/brev/annons – hämtar annonstexten från en länk.
// 1. Platsbanken-länkar hämtas via Arbetsförmedlingens öppna JobSearch-API.
// 2. Andra sidor: letar efter strukturerad data (schema.org JobPosting),
//    annars plockas den synliga texten ut ur HTML:en.

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { GRANSER } from "../../../personligt-brev/_lib/alternativ";
import { AnvandarFel, felSvar, kontrolleraGrans } from "../../../personligt-brev/_lib/server";

type Annons = { titel: string; arbetsgivare: string; text: string; kalla: string };

const MAX_HTML = 3 * 1024 * 1024;

/* ---------- Säkerhet: hämta aldrig interna adresser (SSRF-skydd) ---------- */

function arPrivatIp(ip: string): boolean {
  if (ip.startsWith("::ffff:")) return arPrivatIp(ip.slice(7));
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

async function kontrolleraUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AnvandarFel("Det där ser inte ut som en giltig länk.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new AnvandarFel("Länken måste börja med https://");
  if (url.port && url.port !== "80" && url.port !== "443") throw new AnvandarFel("Länken kan inte hämtas.");
  if (url.username || url.password) throw new AnvandarFel("Länken kan inte hämtas.");

  const adresser = await lookup(url.hostname, { all: true }).catch(() => []);
  if (adresser.length === 0) throw new AnvandarFel("Hittade inte webbplatsen. Stämmer länken?");
  if (adresser.some((a) => arPrivatIp(a.address))) throw new AnvandarFel("Länken kan inte hämtas.");
  return url;
}

// Följer högst 3 omdirigeringar och kontrollerar varje ny adress.
async function hamtaSakert(start: URL) {
  let url = start;
  for (let i = 0; i < 4; i++) {
    const response = await fetch(url, {
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PersonligtBrev/1.0)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) break;
      url = await kontrolleraUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new AnvandarFel(`Sidan svarade med fel (${response.status}). Klistra in annonstexten i stället.`);
    return { response, url };
  }
  throw new AnvandarFel("Länken omdirigerades för många gånger.");
}

async function lasBegransat(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const delar: Uint8Array[] = [];
  let storlek = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    storlek += value.length;
    if (storlek > MAX_HTML) {
      await reader.cancel();
      break;
    }
    delar.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(delar));
}

/* ---------- HTML → text ---------- */

const ENTITETER: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…",
  aring: "å", auml: "ä", ouml: "ö", Aring: "Å", Auml: "Ä", Ouml: "Ö", eacute: "é", uuml: "ü", bull: "•",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
};

function avkodaEntiteter(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (hel, kod: string) => {
    if (kod[0] === "#") {
      const n = kod[1].toLowerCase() === "x" ? parseInt(kod.slice(2), 16) : parseInt(kod.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : hel;
    }
    return ENTITETER[kod] ?? hel;
  });
}

function htmlTillText(html: string) {
  return avkodaEntiteter(
    html
      .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<\/(p|div|h[1-6]|li|ul|ol|section|article|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hittaJobPosting(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    for (const d of data) {
      const hit = hittaJobPosting(d);
      if (hit) return hit;
    }
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const typ = obj["@type"];
  if (typ === "JobPosting" || (Array.isArray(typ) && typ.includes("JobPosting"))) return obj;
  return hittaJobPosting(obj["@graph"]);
}

function tolkaHtml(html: string, url: URL): Annons {
  // 1) Strukturerad data – de flesta större jobbsajter har detta för Google Jobs.
  for (const match of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const posting = hittaJobPosting(JSON.parse(match[1]));
      if (posting && typeof posting.description === "string") {
        const org = posting.hiringOrganization as { name?: unknown } | undefined;
        return {
          titel: typeof posting.title === "string" ? avkodaEntiteter(posting.title) : "",
          arbetsgivare: typeof org?.name === "string" ? avkodaEntiteter(org.name) : "",
          text: htmlTillText(avkodaEntiteter(posting.description)),
          kalla: url.toString(),
        };
      }
    } catch {
      // Trasig JSON-LD – prova nästa.
    }
  }

  // 2) Annars: den synliga texten, helst bara <main> eller <article>.
  const utanBrus = html.replace(/<(header|footer|nav|aside|form)[\s\S]*?<\/\1>/gi, " ");
  const innehall =
    utanBrus.match(/<main[\s\S]*?<\/main>/i)?.[0] ??
    utanBrus.match(/<article[\s\S]*?<\/article>/i)?.[0] ??
    utanBrus.match(/<body[\s\S]*<\/body>/i)?.[0] ??
    utanBrus;
  const titel = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";

  return { titel: htmlTillText(titel), arbetsgivare: "", text: htmlTillText(innehall), kalla: url.toString() };
}

/* ---------- Platsbanken ---------- */

async function hamtaFranPlatsbanken(id: string, url: string): Promise<Annons> {
  const response = await fetch(`https://jobsearch.api.jobtechdev.se/ad/${id}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (response.status === 404) throw new AnvandarFel("Annonsen finns inte längre i Platsbanken.");
  if (!response.ok) throw new AnvandarFel("Platsbanken svarade inte. Klistra in annonstexten i stället.");

  const ad = (await response.json()) as {
    headline?: string;
    employer?: { name?: string };
    description?: { text?: string };
  };
  return {
    titel: ad.headline ?? "",
    arbetsgivare: ad.employer?.name ?? "",
    text: ad.description?.text ?? "",
    kalla: url,
  };
}

/* ---------- Route ---------- */

export async function POST(request: Request) {
  try {
    kontrolleraGrans(request, 30);
    const body = (await request.json().catch(() => ({}))) as { url?: unknown };
    const raw = typeof body.url === "string" ? body.url.trim() : "";
    if (!raw) throw new AnvandarFel("Klistra in en länk till annonsen.");

    let annons: Annons;
    const platsbanken = raw.match(/arbetsformedlingen\.se\/platsbanken\/annonser\/(\d+)/i);

    if (platsbanken) {
      annons = await hamtaFranPlatsbanken(platsbanken[1], raw);
    } else {
      const { response, url } = await hamtaSakert(await kontrolleraUrl(raw));
      const typ = response.headers.get("content-type") ?? "";
      if (!typ.includes("html")) throw new AnvandarFel("Länken pekar inte på en webbsida. Klistra in annonstexten i stället.");
      annons = tolkaHtml(await lasBegransat(response), url);
    }

    if (annons.text.length < 200) {
      throw new AnvandarFel(
        "Hittade ingen annonstext på sidan – den laddas troligen med JavaScript eller kräver inloggning. Kopiera och klistra in annonstexten i stället.",
        422,
      );
    }

    return Response.json({ ...annons, text: annons.text.slice(0, GRANSER.annons) });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return Response.json({ fel: "Sidan tog för lång tid att svara. Klistra in annonstexten i stället." }, { status: 504 });
    }
    return felSvar(error);
  }
}
