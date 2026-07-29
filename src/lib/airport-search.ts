import airportsData from "@/lib/airports-dataset.json";
import { METRO_GROUPS } from "@/lib/metro-groups";

type RawAirport = {
  iataCode: string;
  name: string;
  cityName: string;
  country: string;
  search: string;
};

const AIRPORTS = airportsData as RawAirport[];
const AIRPORTS_BY_CODE = new Map(AIRPORTS.map((a) => [a.iataCode, a]));

export type AirportResult = {
  iataCode: string;
  name: string;
  cityName: string;
  country: string;
  isMetro?: boolean;
};

export function searchAirports(query: string, limit = 8): AirportResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const metroMatches: AirportResult[] = METRO_GROUPS.filter((m) =>
    m.cityName.toLowerCase().includes(q),
  ).map((m) => ({
    iataCode: m.code,
    name: "All airports",
    cityName: m.cityName,
    country: AIRPORTS_BY_CODE.get(m.memberCodes[0])?.country ?? "",
    isMetro: true,
  }));

  const airportMatches: AirportResult[] = AIRPORTS.filter((a) => a.search.includes(q))
    .sort((a, b) => {
      const aStarts = a.cityName.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.cityName.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.cityName.localeCompare(b.cityName);
    })
    .slice(0, limit)
    .map((a) => ({
      iataCode: a.iataCode,
      name: a.name,
      cityName: a.cityName,
      country: a.country,
    }));

  return [...metroMatches, ...airportMatches].slice(0, limit);
}

/** ISO 3166-1 alpha-2 country code for an airport, e.g. "PT" for LIS. */
export function getCountryForIata(iataCode: string): string | undefined {
  return AIRPORTS_BY_CODE.get(iataCode)?.country;
}
