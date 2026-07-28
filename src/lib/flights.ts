import Amadeus from "amadeus";
import { format } from "date-fns";
import { prisma } from "@/lib/db";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type AmadeusOffer = { price?: { total?: string; currency?: string } };

let cachedClient: InstanceType<typeof Amadeus> | null | undefined;

function getClient(): InstanceType<typeof Amadeus> | null {
  if (cachedClient !== undefined) return cachedClient;

  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  cachedClient = clientId && clientSecret ? new Amadeus({ clientId, clientSecret }) : null;
  return cachedClient;
}

export function isFlightSearchConfigured(): boolean {
  return getClient() !== null;
}

export type FareQuote = { priceCents: number; currency: string };

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
 * Cheapest round-trip fare for a route on specific dates, via the Amadeus
 * Flight Offers Search API. Caches results in FlightSearch for a few hours
 * so a page of several destinations doesn't re-query the API on every load.
 * Returns null if no provider is configured or the search comes up empty --
 * callers should fall back to sample fares in that case.
 */
export async function searchCheapestFare(params: {
  originIataCode: string;
  destinationIataCode: string;
  departDate: Date;
  returnDate: Date;
}): Promise<FareQuote | null> {
  if (params.originIataCode === params.destinationIataCode) {
    return { priceCents: 0, currency: "USD" };
  }

  const departDateStr = format(params.departDate, "yyyy-MM-dd");
  const returnDateStr = format(params.returnDate, "yyyy-MM-dd");

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
    return { priceCents: cached.cheapestPriceCents, currency: cached.currency ?? "USD" };
  }

  const amadeus = getClient();
  if (!amadeus) return null;

  try {
    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: params.originIataCode,
      destinationLocationCode: params.destinationIataCode,
      departureDate: departDateStr,
      returnDate: returnDateStr,
      adults: "1",
      currencyCode: "USD",
      max: "5",
    });

    const offers = Array.isArray(response.data) ? (response.data as AmadeusOffer[]) : [];
    const prices = offers
      .map((o) => Number(o.price?.total))
      .filter((p) => Number.isFinite(p) && p > 0);
    if (prices.length === 0) return null;

    const cheapest = Math.min(...prices);
    const currency = offers[0]?.price?.currency ?? "USD";
    const priceCents = Math.round(cheapest * 100);

    const window = await getOrCreateAvailabilityWindow(params.departDate, params.returnDate);
    await prisma.flightSearch.create({
      data: {
        availabilityWindowId: window.id,
        originIataCode: params.originIataCode,
        destinationIataCode: params.destinationIataCode,
        departDate: params.departDate,
        returnDate: params.returnDate,
        provider: "amadeus",
        rawResponse: JSON.parse(JSON.stringify(offers)),
        cheapestPriceCents: priceCents,
        currency,
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      },
    });

    return { priceCents, currency };
  } catch {
    return null;
  }
}

/** Deep link to a prefilled flight search, since Amadeus's self-service tier doesn't issue bookable links. */
export function flightBookingUrl(params: {
  originIataCode: string;
  destinationIataCode: string;
  departDate: Date;
  returnDate: Date;
}): string {
  const depart = format(params.departDate, "yyyy-MM-dd");
  const ret = format(params.returnDate, "yyyy-MM-dd");
  const query = `Flights from ${params.originIataCode} to ${params.destinationIataCode} on ${depart} through ${ret}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}
