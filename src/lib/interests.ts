/**
 * Shared interests, and which destinations satisfy them.
 *
 * Two roles:
 *  - tags on destinations you've already saved (Destination.interests)
 *  - a curated catalog of places reachable from both MSP and LHR, so the
 *    planner can propose somewhere you haven't saved yet
 */

export const INTERESTS = [
  "food",
  "nature",
  "museums",
  "beaches",
  "nightlife",
  "history",
  "skiing",
  "cosy",
] as const;

export type Interest = (typeof INTERESTS)[number];

export const INTEREST_LABELS: Record<Interest, string> = {
  food: "Food & drink",
  nature: "Nature & hiking",
  museums: "Museums & art",
  beaches: "Beaches",
  nightlife: "Nightlife",
  history: "History",
  skiing: "Skiing",
  cosy: "Cosy & romantic",
};

export function isInterest(value: string): value is Interest {
  return (INTERESTS as readonly string[]).includes(value);
}

/** Keep only recognised interest tags -- guards against stale DB values. */
export function parseInterests(values: string[]): Interest[] {
  return values.filter(isInterest);
}

export type CatalogCity = {
  iataCode: string;
  cityName: string;
  interests: Interest[];
};

/**
 * Hand-curated candidate destinations, chosen for being reachable from both
 * Minneapolis and London without an absurd routing. Interest tags are
 * editorial judgement, not data from a provider -- treat them as a starting
 * point you can override per-destination.
 */
export const CATALOG: CatalogCity[] = [
  // --- Home cities ---
  // Tagged like anywhere else on purpose. Without these, "Visit Jake" and
  // "Visit Fiona" score zero on interest match, so picking any interest at all
  // would quietly penalise visiting each other.
  { iataCode: "LHR", cityName: "London", interests: ["food", "museums", "history", "nightlife"] },
  { iataCode: "MSP", cityName: "Minneapolis", interests: ["food", "nature", "museums"] },

  // --- Transatlantic meet-in-the-middle favourites ---
  { iataCode: "KEF", cityName: "Reykjavik", interests: ["nature", "cosy"] },
  { iataCode: "DUB", cityName: "Dublin", interests: ["food", "history", "nightlife", "cosy"] },
  { iataCode: "BOS", cityName: "Boston", interests: ["history", "museums", "food"] },
  { iataCode: "JFK", cityName: "New York", interests: ["museums", "food", "nightlife"] },
  { iataCode: "YUL", cityName: "Montreal", interests: ["food", "nightlife", "cosy"] },
  { iataCode: "YYZ", cityName: "Toronto", interests: ["museums", "food", "nightlife"] },

  // --- Western Europe ---
  { iataCode: "AMS", cityName: "Amsterdam", interests: ["museums", "nightlife", "cosy"] },
  { iataCode: "CDG", cityName: "Paris", interests: ["museums", "food", "history", "cosy"] },
  { iataCode: "BRU", cityName: "Brussels", interests: ["food", "history"] },
  { iataCode: "EDI", cityName: "Edinburgh", interests: ["history", "nature", "cosy"] },
  { iataCode: "LIS", cityName: "Lisbon", interests: ["food", "beaches", "history", "nightlife"] },
  { iataCode: "OPO", cityName: "Porto", interests: ["food", "history", "cosy"] },
  { iataCode: "MAD", cityName: "Madrid", interests: ["museums", "food", "nightlife"] },
  { iataCode: "BCN", cityName: "Barcelona", interests: ["beaches", "food", "nightlife", "museums"] },
  { iataCode: "NCE", cityName: "Nice", interests: ["beaches", "food", "cosy"] },

  // --- Italy & the Mediterranean ---
  { iataCode: "FCO", cityName: "Rome", interests: ["history", "food", "museums"] },
  { iataCode: "MXP", cityName: "Milan", interests: ["food", "museums", "nightlife"] },
  { iataCode: "VCE", cityName: "Venice", interests: ["history", "cosy", "museums"] },
  { iataCode: "NAP", cityName: "Naples", interests: ["food", "history", "beaches"] },
  { iataCode: "ATH", cityName: "Athens", interests: ["history", "beaches", "food"] },
  { iataCode: "AGP", cityName: "Malaga", interests: ["beaches", "food", "nightlife"] },

  // --- Central & Eastern Europe ---
  { iataCode: "BER", cityName: "Berlin", interests: ["museums", "nightlife", "history"] },
  { iataCode: "MUC", cityName: "Munich", interests: ["food", "nature", "skiing", "history"] },
  { iataCode: "PRG", cityName: "Prague", interests: ["history", "nightlife", "cosy"] },
  { iataCode: "VIE", cityName: "Vienna", interests: ["museums", "history", "cosy"] },
  { iataCode: "BUD", cityName: "Budapest", interests: ["nightlife", "history", "food"] },
  { iataCode: "KRK", cityName: "Krakow", interests: ["history", "food", "nightlife"] },

  // --- The Alps & the Nordics ---
  { iataCode: "ZRH", cityName: "Zurich", interests: ["skiing", "nature", "cosy"] },
  { iataCode: "GVA", cityName: "Geneva", interests: ["skiing", "nature"] },
  { iataCode: "INN", cityName: "Innsbruck", interests: ["skiing", "nature", "cosy"] },
  { iataCode: "CPH", cityName: "Copenhagen", interests: ["food", "museums", "cosy"] },
  { iataCode: "OSL", cityName: "Oslo", interests: ["nature", "skiing", "museums"] },
  { iataCode: "ARN", cityName: "Stockholm", interests: ["museums", "food", "cosy"] },
  { iataCode: "HEL", cityName: "Helsinki", interests: ["nature", "cosy", "museums"] },

  // --- North America ---
  { iataCode: "IAD", cityName: "Washington DC", interests: ["museums", "history"] },
  { iataCode: "ORD", cityName: "Chicago", interests: ["food", "museums", "nightlife"] },
  { iataCode: "MSY", cityName: "New Orleans", interests: ["food", "nightlife", "history"] },
  { iataCode: "DEN", cityName: "Denver", interests: ["nature", "skiing"] },
  { iataCode: "SEA", cityName: "Seattle", interests: ["nature", "food"] },
  { iataCode: "SFO", cityName: "San Francisco", interests: ["food", "nature", "museums"] },
  { iataCode: "MIA", cityName: "Miami", interests: ["beaches", "nightlife", "food"] },
  { iataCode: "BNA", cityName: "Nashville", interests: ["nightlife", "food", "history"] },
];

const CATALOG_BY_IATA = new Map(CATALOG.map((c) => [c.iataCode, c]));

/** Catalog interests for an airport, if we have an editorial opinion about it. */
export function catalogInterests(iataCode: string): Interest[] {
  return CATALOG_BY_IATA.get(iataCode)?.interests ?? [];
}

/**
 * How well a destination matches what you're both into, from 0 to 1.
 *
 * Normalised by how many interests you picked, so choosing more interests
 * doesn't inflate every destination's score. With nothing chosen there's no
 * signal either way, so everything scores neutral rather than zero.
 */
export function interestMatch(
  destinationInterests: readonly string[],
  chosen: readonly Interest[],
): number {
  if (chosen.length === 0) return 0.5;
  if (destinationInterests.length === 0) return 0;

  const tags = new Set(destinationInterests);
  const hits = chosen.filter((interest) => tags.has(interest)).length;
  return hits / chosen.length;
}
