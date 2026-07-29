import { getCountryForIata } from "@/lib/airport-search";

/**
 * Rough relative cost-of-living tier by country (hotels + food + everyday
 * costs), 1 (cheapest) to 4 (most expensive) -- like a travel guide's $
 * rating. This is a broad approximation from general knowledge, not a live
 * pricing feed, and it's country-level so it can't capture that e.g. a
 * budget US city is cheaper than a luxury one in the same country.
 */
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

export function getCostTier(iataCode: string): 1 | 2 | 3 | 4 | null {
  const country = getCountryForIata(iataCode);
  if (!country) return null;
  return COUNTRY_COST_TIER[country] ?? null;
}
