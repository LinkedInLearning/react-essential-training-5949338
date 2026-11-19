// POST /api/brev – skriver ett nytt brev, eller reviderar ett befintligt.
// Svaret strömmas som ren text så att brevet syns medan det skrivs.

import { GRANSER, REVISIONER } from "../../personligt-brev/_lib/alternativ";
import {
  AnvandarFel,
  anropaOpenRouter,
  brevSystemPrompt,
  felSvar,
  kontrolleraGrans,
  lasUnderlag,
  sseTillText,
  underlagsPrompt,
  type Meddelande,
} from "../../personligt-brev/_lib/server";

export async function POST(request: Request) {
  try {
    kontrolleraGrans(request);
    const { body, annons, cv, installningar } = await lasUnderlag(request);

    const messages: Meddelande[] = [
      { role: "system", content: brevSystemPrompt(installningar) },
      { role: "user", content: underlagsPrompt(annons, cv, installningar) },
    ];

    // Revidering: skicka med det nuvarande brevet (som användaren kan ha redigerat).
    if (body.revision !== undefined) {
      const nuvarande = typeof body.nuvarandeBrev === "string" ? body.nuvarandeBrev.trim().slice(0, GRANSER.brev) : "";
      if (!nuvarande) throw new AnvandarFel("Det finns inget brev att ändra.");

      const snabbval =
        typeof body.revision === "string" && Object.hasOwn(REVISIONER, body.revision)
          ? REVISIONER[body.revision as keyof typeof REVISIONER].prompt
          : null;
      const egen = typeof body.instruktion === "string" ? body.instruktion.trim().slice(0, GRANSER.instruktion) : "";
      const instruktion = snabbval ?? egen;
      if (!instruktion) throw new AnvandarFel("Skriv vad du vill ändra.");

      messages.push(
        { role: "assistant", content: nuvarande },
        {
          role: "user",
          content: `Ändra brevet enligt följande: ${instruktion}\n\nFölj fortfarande alla regler (hitta inte på något). Behåll sådant den sökande själv har skrivit in om det inte strider mot ändringen. Svara bara med hela det nya brevet.`,
        },
      );
    }

    const upstream = await anropaOpenRouter(messages, {
      stream: true,
      maxTokens: 3000,
      temperature: 0.7,
      signal: request.signal, // avbryter även hos OpenRouter om användaren trycker "Avbryt"
    });
    if (!upstream.body) throw new Error("Tomt svar från OpenRouter");

    return new Response(sseTillText(upstream.body), {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) {
    return felSvar(error);
  }
}
