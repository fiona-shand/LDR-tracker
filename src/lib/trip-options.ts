import type { WeekendAvailability } from "@/lib/availability";
import { getDestinations } from "@/lib/destinations-data";
import { searchCheapestFare } from "@/lib/flights";
import { FIONA, JAKE } from "@/lib/people";

export type LegFare = {
  /** null = no live fare found for this leg (not a fake placeholder number). */
  price: number | null;
  durationMinutes?: number;
  departureTime?: string;
  arrivalTime?: string;
  airline?: string;
  bookUrl?: string;
};

export type TripOption = {
  key: string;
  title: string;
  subtitle: string;
  iataCode: string;
  /** Plain city name for image/cost lookups -- "London", not "London Heathrow". */
  cityName: string;
  fiona: LegFare;
  jake: LegFare;
  /** null when either leg has no live fare -- can't be trusted for sorting/"best value". */
  total: number | null;
  /** Staying at the other person's home (no hotel needed), vs. a neutral meet-in-the-middle city. */
  isHomeStay: boolean;
};

const HOME: LegFare = { price: 0 };

function primaryCityWord(city: string): string {
  return city.split(/[\s–-]+/)[0] ?? city;
}

async function getFare(
  originIataCode: string,
  destinationIataCode: string,
  weekend: WeekendAvailability | null,
): Promise<LegFare> {
  if (originIataCode === destinationIataCode) return HOME;
  if (!weekend) return { price: null };

  const quote = await searchCheapestFare({
    originIataCode,
    destinationIataCode,
    departDate: weekend.friday,
    returnDate: weekend.sunday,
  });
  if (!quote) return { price: null };

  return {
    price: quote.price,
    durationMinutes: quote.durationMinutes,
    departureTime: quote.departureTime,
    arrivalTime: quote.arrivalTime,
    airline: quote.airline,
    bookUrl: quote.bookUrl,
  };
}

function total(a: LegFare, b: LegFare): number | null {
  if (a.price == null || b.price == null) return null;
  return a.price + b.price;
}

export async function buildTripOptions(weekend: WeekendAvailability | null): Promise<{
  options: TripOption[];
  anyRealFares: boolean;
  destinationsError: boolean;
}> {
  const { destinations, error: destinationsError } = await getDestinations();

  const [fionaToJake, jakeToFiona, ...meetFares] = await Promise.all([
    getFare(FIONA.airport.iataCode, JAKE.airport.iataCode, weekend),
    getFare(JAKE.airport.iataCode, FIONA.airport.iataCode, weekend),
    ...destinations.flatMap((d) => [
      getFare(FIONA.airport.iataCode, d.iataCode, weekend),
      getFare(JAKE.airport.iataCode, d.iataCode, weekend),
    ]),
  ]);

  const anyRealFares = [fionaToJake, jakeToFiona, ...meetFares].some((f) => f.bookUrl);

  const visitJake: TripOption = {
    key: "visit-jake",
    title: `Visit ${JAKE.name}`,
    subtitle: JAKE.airport.city,
    iataCode: JAKE.airport.iataCode,
    cityName: primaryCityWord(JAKE.airport.city),
    fiona: fionaToJake,
    jake: HOME,
    total: total(fionaToJake, HOME),
    isHomeStay: true,
  };

  const visitFiona: TripOption = {
    key: "visit-fiona",
    title: `Visit ${FIONA.name}`,
    subtitle: FIONA.airport.city,
    iataCode: FIONA.airport.iataCode,
    cityName: primaryCityWord(FIONA.airport.city),
    fiona: HOME,
    jake: jakeToFiona,
    total: total(HOME, jakeToFiona),
    isHomeStay: true,
  };

  const meetOptions: TripOption[] = destinations.map((d, i) => {
    const fiona = meetFares[i * 2];
    const jake = meetFares[i * 2 + 1];
    return {
      key: d.id,
      title: `Meet in ${d.cityName}`,
      subtitle: "Halfway-ish",
      iataCode: d.iataCode,
      cityName: d.cityName,
      fiona,
      jake,
      total: total(fiona, jake),
      isHomeStay: false,
    };
  });

  // Options with a real total sort cheapest-first; anything missing a fare
  // (so we can't honestly compare it) sinks to the bottom, order preserved.
  const options = [visitJake, visitFiona, ...meetOptions].sort((a, b) => {
    if (a.total == null && b.total == null) return 0;
    if (a.total == null) return 1;
    if (b.total == null) return -1;
    return a.total - b.total;
  });

  return { options, anyRealFares, destinationsError };
}
