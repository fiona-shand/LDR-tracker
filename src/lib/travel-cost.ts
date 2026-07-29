import { getCountryForIata } from "@/lib/airport-search";

/**
 * Rough relative cost-of-living tier (hotels + food + everyday costs),
 * 1 (cheapest) to 4 (most expensive) -- like a travel guide's $ rating.
 * Hand-estimated from general knowledge (not pulled from a live pricing
 * feed), city-level first for well-known destinations, falling back to a
 * broader country-level tier for anything else. Treat it as a rough
 * "cheap vs. splurge" signal, not a real quote.
 */
const CITY_COST_TIER: Record<string, 1 | 2 | 3 | 4> = {
  // 1 -- budget-friendly
  "hanoi": 1, "ho chi minh city": 1, "bangkok": 1, "chiang mai": 1, "bali": 1,
  "jakarta": 1, "manila": 1, "phnom penh": 1, "vientiane": 1, "kathmandu": 1,
  "colombo": 1, "delhi": 1, "mumbai": 1, "cairo": 1, "marrakesh": 1, "marrakech": 1,
  "bogota": 1, "medellin": 1, "lima": 1, "la paz": 1, "quito": 1, "guatemala city": 1,
  "budapest": 1, "sofia": 1, "tirana": 1,
  // 2 -- moderate
  "lisbon": 2, "porto": 2, "madrid": 2, "barcelona": 2, "seville": 2, "athens": 2,
  "krakow": 2, "prague": 2, "warsaw": 2, "istanbul": 2, "zagreb": 2, "belgrade": 2,
  "ljubljana": 2, "bucharest": 2, "beijing": 2, "shanghai": 2, "kuala lumpur": 2,
  "cape town": 2, "johannesburg": 2, "sao paulo": 2, "rio de janeiro": 2,
  "buenos aires": 2, "mexico city": 2, "san jose": 2, "moscow": 2,
  "atlanta": 2, "houston": 2, "phoenix": 2, "san antonio": 2, "detroit": 2,
  "philadelphia": 2, "minneapolis": 2, "st paul": 2, "pittsburgh": 2, "cleveland": 2,
  // 3 -- pricier
  "rome": 3, "milan": 3, "florence": 3, "venice": 3, "naples": 3, "paris": 3,
  "berlin": 3, "munich": 3, "hamburg": 3, "amsterdam": 3, "rotterdam": 3,
  "brussels": 3, "vienna": 3, "dublin": 3, "toronto": 3, "vancouver": 3,
  "montreal": 3, "sydney": 3, "melbourne": 3, "brisbane": 3, "auckland": 3,
  "tokyo": 3, "osaka": 3, "kyoto": 3, "seoul": 3, "tel aviv": 3,
  "chicago": 3, "denver": 3, "austin": 3, "dallas": 3, "portland": 3,
  "seattle": 3, "washington": 3, "miami": 3, "orlando": 3, "las vegas": 3,
  // 4 -- expensive
  "london": 4, "edinburgh": 4, "new york": 4, "boston": 4, "san francisco": 4,
  "los angeles": 4, "san diego": 4, "honolulu": 4, "zurich": 4, "geneva": 4,
  "oslo": 4, "bergen": 4, "copenhagen": 4, "stockholm": 4, "helsinki": 4,
  "reykjavik": 4, "reykjavík": 4, "singapore": 4, "hong kong": 4, "dubai": 4,
  "abu dhabi": 4, "doha": 4,
};

const COUNTRY_COST_TIER: Record<string, 1 | 2 | 3 | 4> = {
  // 1 -- budget-friendly
  VN: 1, TH: 1, ID: 1, IN: 1, PH: 1, KH: 1, LA: 1, NP: 1, LK: 1, BD: 1, PK: 1,
  EG: 1, MA: 1, TN: 1, CO: 1, PE: 1, BO: 1, PY: 1, EC: 1, GT: 1,
  // 2 -- moderate
  PT: 2, ES: 2, GR: 2, PL: 2, CZ: 2, HU: 2, HR: 2, RO: 2, BG: 2, TR: 2,
  CN: 2, MY: 2, ZA: 2, BR: 2, AR: 2, MX: 2, CR: 2, RU: 2, RS: 2, SI: 2,
  // 3 -- pricier
  IT: 3, FR: 3, DE: 3, NL: 3, BE: 3, AT: 3, IE: 3, CA: 3, AU: 3, NZ: 3,
  JP: 3, KR: 3, IL: 3, LU: 3, MT: 3,
  // 4 -- expensive
  GB: 4, US: 4, CH: 4, NO: 4, DK: 4, SE: 4, FI: 4, IS: 4, SG: 4, AE: 4, HK: 4, QA: 4,
};

export function getCostTier(iataCode: string, cityName?: string): 1 | 2 | 3 | 4 | null {
  if (cityName) {
    const cityTier = CITY_COST_TIER[cityName.trim().toLowerCase()];
    if (cityTier) return cityTier;
  }

  const country = getCountryForIata(iataCode);
  if (!country) return null;
  return COUNTRY_COST_TIER[country] ?? null;
}
