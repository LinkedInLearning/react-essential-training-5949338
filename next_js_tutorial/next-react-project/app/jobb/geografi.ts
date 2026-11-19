// Hämtar Sveriges län och kommuner från JobTechs taxonomi-API.
// Det är samma concept-id:n som JobAd Links använder i parametrarna
// `region` och `municipality`.

export type Kommun = { id: string; namn: string };
export type Lan = { id: string; namn: string; kommuner: Kommun[] };

const SVERIGE_ID = "i46j_HmG_v64";

const QUERY = `query {
  concepts(id: "${SVERIGE_ID}") {
    narrower(type: "region") {
      id
      preferred_label
      narrower(type: "municipality") { id preferred_label }
    }
  }
}`;

type TaxonomiSvar = {
  data?: {
    concepts?: {
      narrower?: {
        id: string;
        preferred_label: string;
        narrower?: { id: string; preferred_label: string }[];
      }[];
    }[];
  };
};

const svenskOrdning = new Intl.Collator("sv-SE");

export async function hamtaLan(): Promise<Lan[]> {
  const url = new URL("https://taxonomy.api.jobtechdev.se/v1/taxonomy/graphql");
  url.searchParams.set("query", QUERY);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      // Län och kommuner ändras nästan aldrig – cacha i ett dygn.
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Taxonomy svarade med HTTP ${response.status}`);

    const json = (await response.json()) as TaxonomiSvar;
    const regioner = json.data?.concepts?.[0]?.narrower ?? [];

    return regioner
      .map((region) => ({
        id: region.id,
        namn: region.preferred_label,
        kommuner: (region.narrower ?? [])
          .map((kommun) => ({ id: kommun.id, namn: kommun.preferred_label }))
          .sort((a, b) => svenskOrdning.compare(a.namn, b.namn)),
      }))
      .filter((lan) => lan.kommuner.length > 0)
      .sort((a, b) => svenskOrdning.compare(a.namn, b.namn));
  } catch (error) {
    console.error("Kunde inte hämta län och kommuner", error);
    return [];
  }
}
