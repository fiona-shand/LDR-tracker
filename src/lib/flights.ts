import { format } from "date-fns";
import { prisma } from "@/lib/db";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

// You two only fly direct, so every search asks Google Flights for nonstop
// only (stops=1) and drops anything longer than this.
const NONSTOP_ONLY = "1";
const MAX_FLIGHT_MINUTES = 15 * 60;

// A "weekend trip" leaves Friday afternoon and comes back sometime Sunday
// midday through night -- bias the search toward those departure/arrival
// windows instead of red-eyes or early-morning flights.
const OUTBOUND_TIME_RANGE = "12,21"; // Friday: depart between noon and 9pm
const RETURN_TIME_RANGE = "11,23"; // Sunday: depart between 11am and 11pm

export type FareQuote = {
  price: number;
  currency: string;
  /** Outbound flight time in minutes, if the provider reported it. */
  durationMinutes?: number;
  departureTime?: string;
  arrivalTime?: string;
  airline?: string;
  bookUrl: string;
};

type SerpFlightLeg = {
  departure_airport?: { id?: string; name?: string; time?: string };
  arrival_airport?: { id?: string; name?: string; time?: string };
  duration?: number;
  airline?: string;
  flight_number?: string;
};

type SerpFlightOption = {
  price?: number;
  total_duration?: number;
  flights?: SerpFlightLeg[];
};

type SerpFlightsResponse = {
  error?: string;
  search_metadata?: { google_flights_url?: string };
  best_flights?: SerpFlightOption[];
  other_flights?: SerpFlightOption[];
};

export function isFlightSearchConfigured(): boolean {
  return !!process.env.SERPAPI_API_KEY;
}

/** Deep link to a prefilled Google Flights search, used as the "book" target. */
export function flightBookingUrl(params: {
  originIataCode: string;
  destinationIataCode: string;
  departDate: Date;
  returnDate: Date;
}): string {
  const depart = format(params.departDate, "yyyy-MM-dd");
  const ret = format(params.returnDate, "yyyy-MM-dd");
  const query = `Flights from ${params.originIataCode} to ${params.destinationIataCode} on ${depart} through ${ret} nonstop`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}

function pickCheapest(response: SerpFlightsResponse): SerpFlightOption | null {
  const options = [...(response.best_flights ?? []), ...(response.other_flights ?? [])].filter(
    (o) => typeof o.price === "number" && o.price > 0,
  );
  if (options.length === 0) return null;

  // stops=1 already restricts to nonstop, but a slice with more than one leg
  // would mean a connection slipped through -- drop those defensively.
  const nonstop = options.filter((o) => !o.flights || o.flights.length <= 1);
  const pool = nonstop.length > 0 ? nonstop : options;

  const withinCap = pool.filter(
    (o) => typeof o.total_duration !== "number" || o.total_duration <= MAX_FLIGHT_MINUTES,
  );
  const finalPool = withinCap.length > 0 ? withinCap : pool;

  return finalPool.reduce((best, o) => (o.price! < best.price! ? o : best));
}

function toQuote(option: SerpFlightOption, bookUrl: string): FareQuote {
  const leg = option.flights?.[0];
  return {
    price: option.price!,
    currency: "USD",
    durationMinutes: option.total_duration ?? leg?.duration,
    departureTime: leg?.departure_airport?.time,
    arrivalTime: leg?.arrival_airport?.time,
    airline: leg?.airline,
    bookUrl,
  };
}

async function getOrCreateAvailabilityWindow(startsAt: Date, endsAt: Date) {
  const existing = await prisma.availabilityWindow.findFirst({
    where: { startsAt, endsAt, weekendOnly: true },
  });
  if (existing) return existing;
  return prisma.availabilityWindow.create({
    data: { startsAt, endsAt, weekdayCount: 0, weekendOnly: true },
  });
}

/**
 * Cheapest nonstop round trip for a route on specific dates, via SerpApi's
 * Google Flights engine. Results are cached in FlightSearch for half a day so
 * that browsing several weekends stays well inside the free search quota.
 * Returns null when no provider is configured or nothing matched, so callers
 * can fall back to placeholder fares.
 */
export async function searchCheapestFare(params: {
  originIataCode: string;
  destinationIataCode: string;
  departDate: Date;
  returnDate: Date;
}): Promise<FareQuote | null> {
  if (params.originIataCode === params.destinationIataCode) return null;

  const bookUrl = flightBookingUrl(params);

  try {
    const cached = await prisma.flightSearch.findFirst({
      where: {
        originIataCode: params.originIataCode,
        destinationIataCode: params.destinationIataCode,
        departDate: params.departDate,
        expiresAt: { gt: new Date() },
      },
      orderBy: { fetchedAt: "desc" },
    });
    if (cached?.cheapestPriceCents != null) {
      const stored = cached.rawResponse as Partial<FareQuote> | null;
      return {
        price: cached.cheapestPriceCents / 100,
        currency: cached.currency ?? "USD",
        durationMinutes: stored?.durationMinutes,
        departureTime: stored?.departureTime,
        arrivalTime: stored?.arrivalTime,
        airline: stored?.airline,
        bookUrl,
      };
    }
  } catch {
    // No database (or it's down) -- fall through to a live search.
  }

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_flights");
  url.searchParams.set("departure_id", params.originIataCode);
  url.searchParams.set("arrival_id", params.destinationIataCode);
  url.searchParams.set("outbound_date", format(params.departDate, "yyyy-MM-dd"));
  url.searchParams.set("return_date", format(params.returnDate, "yyyy-MM-dd"));
  url.searchParams.set("type", "1"); // round trip
  url.searchParams.set("stops", NONSTOP_ONLY);
  url.searchParams.set("max_duration", String(MAX_FLIGHT_MINUTES));
  url.searchParams.set("outbound_times", OUTBOUND_TIME_RANGE);
  url.searchParams.set("return_times", RETURN_TIME_RANGE);
  url.searchParams.set("currency", "USD");
  url.searchParams.set("hl", "en");
  url.searchParams.set("api_key", apiKey);

  let response: SerpFlightsResponse;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    response = (await res.json()) as SerpFlightsResponse;
  } catch {
    return null;
  }

  if (response.error) return null;

  const cheapest = pickCheapest(response);
  if (!cheapest) return null;

  const quote = toQuote(cheapest, response.search_metadata?.google_flights_url ?? bookUrl);

  try {
    const window = await getOrCreateAvailabilityWindow(params.departDate, params.returnDate);
    await prisma.flightSearch.create({
      data: {
        availabilityWindowId: window.id,
        originIataCode: params.originIataCode,
        destinationIataCode: params.destinationIataCode,
        departDate: params.departDate,
        returnDate: params.returnDate,
        provider: "serpapi-google-flights",
        rawResponse: {
          durationMinutes: quote.durationMinutes ?? null,
          departureTime: quote.departureTime ?? null,
          arrivalTime: quote.arrivalTime ?? null,
          airline: quote.airline ?? null,
        },
        cheapestPriceCents: Math.round(quote.price * 100),
        currency: quote.currency,
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      },
    });
  } catch {
    // Caching is best-effort -- still return the live quote if the write fails.
  }

  return quote;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}
