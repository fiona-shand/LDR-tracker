import Link from "next/link";
import { format } from "date-fns";
import DestinationFareCard, {
  type LegFare,
  type TripOption,
} from "@/components/destination-fare-card";
import {
  getAvailabilitySnapshot,
  getUpcomingWeekends,
  getWeekendBySaturdayIso,
  type WeekendAvailability,
} from "@/lib/availability";
import { getDestinations } from "@/lib/destinations-data";
import { isFlightSearchConfigured, searchCheapestFare } from "@/lib/flights";
import { FIONA, JAKE } from "@/lib/people";

export const dynamic = "force-dynamic";

const HOME: LegFare = { price: 0 };

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

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ weekend?: string }>;
}) {
  const { weekend: weekendParam } = await searchParams;

  const snapshot = await getAvailabilitySnapshot();
  const upcomingFreeWeekends = getUpcomingWeekends(snapshot, 10).filter((w) => w.bothFree);
  const weekend =
    (weekendParam ? getWeekendBySaturdayIso(snapshot, weekendParam) : null) ??
    upcomingFreeWeekends[0] ??
    null;

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
    fiona: fionaToJake,
    jake: HOME,
    total: total(fionaToJake, HOME),
  };

  const visitFiona: TripOption = {
    key: "visit-fiona",
    title: `Visit ${FIONA.name}`,
    subtitle: FIONA.airport.city,
    iataCode: FIONA.airport.iataCode,
    fiona: HOME,
    jake: jakeToFiona,
    total: total(HOME, jakeToFiona),
  };

  const meetOptions: TripOption[] = destinations.map((d, i) => {
    const fiona = meetFares[i * 2];
    const jake = meetFares[i * 2 + 1];
    return {
      key: d.id,
      title: `Meet in ${d.cityName}`,
      subtitle: "Halfway-ish",
      iataCode: d.iataCode,
      fiona,
      jake,
      total: total(fiona, jake),
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
  const bestIndex = options.findIndex((o) => o.total != null);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Plan a trip</h1>
        <p className="mt-1 text-sm text-muted">
          Comparing nonstop flights from {FIONA.airport.iataCode} and {JAKE.airport.iataCode}
          {" "}for a free weekend.
        </p>
      </div>

      {weekend ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-surface-border bg-surface p-4 shadow-sm">
          <span className="text-sm text-muted">Weekend of</span>
          <span className="font-semibold">
            {format(weekend.friday, "EEE, MMM d")} – {format(weekend.sunday, "EEE, MMM d")}
          </span>
          {upcomingFreeWeekends.length > 1 && (
            <div className="ml-auto flex flex-wrap gap-2">
              {upcomingFreeWeekends.slice(0, 5).map((w) => {
                const iso = format(w.saturday, "yyyy-MM-dd");
                const active = format(weekend.saturday, "yyyy-MM-dd") === iso;
                return (
                  <Link
                    key={iso}
                    href={`/search?weekend=${iso}`}
                    className={`rounded-full border px-3 py-1 text-xs transition-all active:scale-95 ${
                      active
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-surface-border text-muted hover:border-accent hover:text-accent"
                    }`}
                  >
                    {format(w.saturday, "MMM d")}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-2xl border border-surface-border bg-surface p-4 text-sm text-muted">
          No fully-free weekend in the next 10 weeks — check the{" "}
          <Link href="/" className="text-accent underline">
            calendar
          </Link>{" "}
          for details.
        </p>
      )}

      {destinationsError && (
        <p className="rounded-2xl border border-surface-border bg-surface p-3 text-xs text-muted">
          Couldn&apos;t reach the database, so saved destinations aren&apos;t showing right now.
        </p>
      )}
      {weekend && !anyRealFares && (
        <p className="rounded-2xl border border-surface-border bg-surface p-3 text-xs text-muted">
          {isFlightSearchConfigured()
            ? "No nonstop flights found for this weekend."
            : "No live fares — set SERPAPI_API_KEY to search real nonstop prices."}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option, i) => (
          <DestinationFareCard key={option.key} option={option} best={i === bestIndex} />
        ))}
      </div>
    </div>
  );
}
