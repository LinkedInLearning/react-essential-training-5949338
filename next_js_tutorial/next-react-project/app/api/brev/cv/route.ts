// POST /api/brev/cv – tar emot ett CV (PDF, Word eller text) och returnerar texten.
// Filen sparas inte någonstans.

import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import { GRANSER } from "../../../personligt-brev/_lib/alternativ";
import { AnvandarFel, felSvar, kontrolleraGrans } from "../../../personligt-brev/_lib/server";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    kontrolleraGrans(request, 30);

    const formData = await request.formData().catch(() => null);
    const fil = formData?.get("fil");
    if (!(fil instanceof File)) throw new AnvandarFel("Ingen fil skickades.");
    if (fil.size > MAX_BYTES) throw new AnvandarFel("Filen är för stor (max 5 MB).");

    const namn = fil.name.toLowerCase();
    const bytes = new Uint8Array(await fil.arrayBuffer());
    let text: string;

    if (namn.endsWith(".pdf")) {
      const pdf = await getDocumentProxy(bytes);
      text = (await extractText(pdf, { mergePages: true })).text;
    } else if (namn.endsWith(".docx")) {
      text = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
    } else if (namn.endsWith(".txt") || namn.endsWith(".md")) {
      text = new TextDecoder().decode(bytes);
    } else {
      throw new AnvandarFel("Filtypen stöds inte. Använd PDF, Word (.docx) eller .txt.");
    }

    text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (text.length < 50) {
      throw new AnvandarFel("Hittade ingen text i filen. Är den inskannad som bild? Klistra i så fall in texten i stället.");
    }

    return Response.json({ text: text.slice(0, GRANSER.cv), avkortad: text.length > GRANSER.cv });
  } catch (error) {
    if (!(error instanceof AnvandarFel)) {
      console.error("Kunde inte läsa CV", error);
      return Response.json({ fel: "Kunde inte läsa filen. Prova att spara om den eller klistra in texten." }, { status: 400 });
    }
    return felSvar(error);
  }
}
