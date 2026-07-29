import Link from "next/link";
import { format } from "date-fns";
import DestinationFareCard from "@/components/destination-fare-card";
import {
  getAvailabilitySnapshot,
  getUpcomingWeekends,
  getWeekendBySaturdayIso,
} from "@/lib/availability";
import { isFlightSearchConfigured } from "@/lib/flights";
import { buildTripOptions } from "@/lib/trip-options";
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

  const { options, anyRealFares, destinationsError } = await buildTripOptions(weekend);
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

      <Link
        href="/compare"
        className="text-sm font-medium text-accent underline underline-offset-2"
      >
        Compare cost & flight time across destinations →
      </Link>
    </div>
  );
}
