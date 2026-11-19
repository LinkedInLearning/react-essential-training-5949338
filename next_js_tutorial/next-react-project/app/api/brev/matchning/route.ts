// POST /api/brev/matchning – jämför annons och CV och ger krav-för-krav-analys,
// tips och troliga intervjufrågor.

import type { Matchning } from "../../../personligt-brev/_lib/alternativ";
import {
  AnvandarFel,
  anropaOpenRouter,
  felSvar,
  kontrolleraGrans,
  lasUnderlag,
  matchningsPrompt,
  utanTankstreck,
} from "../../../personligt-brev/_lib/server";

const strang = { type: "string" } as const;
const lista = { type: "array", items: strang } as const;

// Schemat skickas som structured output, så modellen kan bara svara med giltig JSON i detta format.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sammanfattning", "krav", "styrkor", "tips", "nyckelord", "intervjufragor"],
  properties: {
    sammanfattning: strang,
    krav: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["krav", "typ", "status", "belagg"],
        properties: {
          krav: strang,
          typ: { type: "string", enum: ["krav", "meriterande"] },
          status: { type: "string", enum: ["uppfyllt", "delvis", "saknas"] },
          belagg: strang,
        },
      },
    },
    styrkor: lista,
    tips: lista,
    nyckelord: lista,
    intervjufragor: lista,
  },
};

// Tankstreck tvättas i de färdiga texterna, aldrig i rå JSON (då kan strukturen gå sönder).
function rensa(value: string, max: number) {
  return utanTankstreck(value).trim().slice(0, max);
}

function strangLista(value: unknown, max: number) {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.trim() !== "").map((v) => rensa(v, 300)).slice(0, max)
    : [];
}

function tolka(innehall: string): Matchning {
  const start = innehall.indexOf("{");
  const slut = innehall.lastIndexOf("}");
  if (start === -1 || slut <= start) throw new Error("Inget JSON i svaret");
  const data = JSON.parse(innehall.slice(start, slut + 1)) as Record<string, unknown>;

  const krav: Matchning["krav"] = Array.isArray(data.krav)
    ? data.krav.flatMap((k): Matchning["krav"] => {
        if (!k || typeof k !== "object") return [];
        const { krav, typ, status, belagg } = k as Record<string, unknown>;
        if (typeof krav !== "string") return [];
        return [{
          krav: rensa(krav, 200),
          typ: typ === "meriterande" ? "meriterande" : "krav",
          status: status === "uppfyllt" || status === "delvis" ? status : "saknas",
          belagg: typeof belagg === "string" ? rensa(belagg, 400) : "",
        }];
      }).slice(0, 10)
    : [];

  return {
    sammanfattning: typeof data.sammanfattning === "string" ? rensa(data.sammanfattning, 800) : "",
    krav,
    styrkor: strangLista(data.styrkor, 6),
    tips: strangLista(data.tips, 6),
    nyckelord: strangLista(data.nyckelord, 15),
    intervjufragor: strangLista(data.intervjufragor, 6),
  };
}

export async function POST(request: Request) {
  try {
    kontrolleraGrans(request);
    const { annons, cv, installningar } = await lasUnderlag(request);
    if (cv.length < 50) throw new AnvandarFel("Bifoga eller klistra in ditt CV för att få en matchningsanalys.");

    const response = await anropaOpenRouter(matchningsPrompt(annons, cv, installningar.extra), {
      stream: false,
      maxTokens: 6000,
      temperature: 0.2,
      signal: request.signal,
      jsonSchema: { name: "matchning", schema: SCHEMA },
    });

    const data = (await response.json()) as {
      choices?: { finish_reason?: string; message?: { content?: string | null } }[];
    };
    const val = data.choices?.[0];
    const innehall = val?.message?.content ?? "";

    if (val?.finish_reason === "length") {
      console.error("Matchningen klipptes av: max_tokens räckte inte.");
      throw new AnvandarFel("Analysen blev för lång och klipptes av. Försök med en kortare annons eller ett kortare CV.", 502);
    }

    try {
      return Response.json(tolka(innehall));
    } catch (error) {
      console.error("Kunde inte tolka matchningen", error, val?.finish_reason, innehall.slice(0, 1000));
      throw new AnvandarFel("Analysen blev inte läsbar den här gången. Försök igen.", 502);
    }
  } catch (error) {
    return felSvar(error);
  }
}
