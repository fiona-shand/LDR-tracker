import Link from "next/link";
import { format } from "date-fns";
import DestinationFareCard, { type TripOption } from "@/components/destination-fare-card";
import { getAvailabilitySnapshot, getUpcomingWeekends, getWeekendBySaturdayIso } from "@/lib/availability";
import { getDestinationsOrSample } from "@/lib/destinations-data";
import { mockFare } from "@/lib/mock-fares";
import { FIONA, JAKE } from "@/lib/people";

export const dynamic = "force-dynamic";

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

  const { destinations, isSample } = await getDestinationsOrSample();

  const visitJake: TripOption = {
    key: "visit-jake",
    title: `Visit ${JAKE.name}`,
    subtitle: JAKE.airport.city,
    iataCode: JAKE.airport.iataCode,
    fareFiona: mockFare(FIONA.airport.iataCode, JAKE.airport.iataCode),
    fareJake: 0,
    total: 0,
  };
  visitJake.total = visitJake.fareFiona + visitJake.fareJake;

  const visitFiona: TripOption = {
    key: "visit-fiona",
    title: `Visit ${FIONA.name}`,
    subtitle: FIONA.airport.city,
    iataCode: FIONA.airport.iataCode,
    fareFiona: 0,
    fareJake: mockFare(JAKE.airport.iataCode, FIONA.airport.iataCode),
    total: 0,
  };
  visitFiona.total = visitFiona.fareFiona + visitFiona.fareJake;

  const meetOptions: TripOption[] = destinations.map((d) => {
    const fareFiona = mockFare(FIONA.airport.iataCode, d.iataCode);
    const fareJake = mockFare(JAKE.airport.iataCode, d.iataCode);
    return {
      key: d.id,
      title: `Meet in ${d.cityName}`,
      subtitle: "Halfway-ish",
      iataCode: d.iataCode,
      fareFiona,
      fareJake,
      total: fareFiona + fareJake,
    };
  });

  const options = [visitJake, visitFiona, ...meetOptions].sort((a, b) => a.total - b.total);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Plan a trip</h1>
        <p className="mt-1 text-sm text-muted">
          Comparing flights from {FIONA.airport.iataCode} and {JAKE.airport.iataCode}
          {" "}for a free weekend.
        </p>
      </div>

      {weekend ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-surface-border bg-surface p-4 shadow-sm">
          <span className="text-sm text-muted">Weekend of</span>
          <span className="font-semibold">
            {format(weekend.saturday, "EEE, MMM d")} – {format(weekend.sunday, "EEE, MMM d")}
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

      {isSample && (
        <p className="rounded-2xl border border-surface-border bg-surface p-3 text-xs text-muted">
          Showing sample destinations and placeholder fares — connect a
          database and a flight search provider to see real results.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option, i) => (
          <DestinationFareCard key={option.key} option={option} best={i === 0} />
        ))}
      </div>
    </div>
  );
}
