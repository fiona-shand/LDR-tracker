import Link from "next/link";
import { addMonths, format, startOfMonth } from "date-fns";
import DestinationFareCard from "@/components/destination-fare-card";
import WeekendDatePicker from "@/components/weekend-date-picker";
import { getAvailabilitySnapshot, getWeekendBySaturdayIso, getUpcomingWeekends } from "@/lib/availability";
import { formatMonthParam, parseMonthParam } from "@/lib/calendar-month";
import { getDestinationImage } from "@/lib/destination-image";
import { isFlightSearchConfigured } from "@/lib/flights";
import { buildTripOptions } from "@/lib/trip-options";
import { FIONA, JAKE } from "@/lib/people";

export const dynamic = "force-dynamic";

// Only look for/suggest dates this far out -- matches the "next 9 months" horizon.
const MONTHS_AHEAD = 9;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ weekend?: string; month?: string }>;
}) {
  const { weekend: weekendParam, month: monthParam } = await searchParams;

  const snapshot = await getAvailabilitySnapshot();
  const upcomingFreeWeekends = getUpcomingWeekends(snapshot, 40).filter((w) => w.bothFree);
  const weekend =
    (weekendParam ? getWeekendBySaturdayIso(snapshot, weekendParam) : null) ??
    upcomingFreeWeekends[0] ??
    null;

  const todayMonth = startOfMonth(new Date());
  const maxMonth = addMonths(todayMonth, MONTHS_AHEAD - 1);
  const defaultMonth = weekend ? startOfMonth(weekend.saturday) : todayMonth;
  const currentMonth = monthParam ? parseMonthParam(monthParam) : defaultMonth;
  const prevMonth = addMonths(currentMonth, -1);
  const nextMonth = addMonths(currentMonth, 1);

  const { options, anyRealFares, destinationsError } = await buildTripOptions(weekend);
  const bestIndex = options.findIndex((o) => o.total != null);
  const imageUrls = await Promise.all(options.map((o) => getDestinationImage(o.cityName)));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Plan a trip</h1>
        <p className="mt-1 text-sm text-muted">
          Comparing nonstop flights from {FIONA.airport.iataCode} and {JAKE.airport.iataCode}
          {" "}for a free weekend.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <WeekendDatePicker
          snapshot={snapshot}
          month={currentMonth}
          selectedSaturdayIso={weekend ? format(weekend.saturday, "yyyy-MM-dd") : undefined}
          basePath="/search"
          prevHref={
            currentMonth > todayMonth ? `/search?month=${formatMonthParam(prevMonth)}` : undefined
          }
          nextHref={
            currentMonth < maxMonth ? `/search?month=${formatMonthParam(nextMonth)}` : undefined
          }
        />

        <div className="flex-1">
          {weekend ? (
            <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-sm">
              <p className="text-sm text-muted">Weekend of</p>
              <p className="text-lg font-semibold">
                {format(weekend.friday, "EEE, MMM d")} – {format(weekend.sunday, "EEE, MMM d")}
              </p>
              <p className="mt-2 text-xs text-muted">
                Pick any highlighted date on the calendar to compare a different weekend — gold
                stars are dates we&apos;d suggest if it&apos;s been a while since your last trip.
              </p>
            </div>
          ) : (
            <p className="rounded-2xl border border-surface-border bg-surface p-4 text-sm text-muted">
              No fully-free weekend in the next {MONTHS_AHEAD} months — check the{" "}
              <Link href="/" className="text-accent underline">
                calendar
              </Link>{" "}
              for details.
            </p>
          )}

          {destinationsError && (
            <p className="mt-3 rounded-2xl border border-surface-border bg-surface p-3 text-xs text-muted">
              Couldn&apos;t reach the database, so saved destinations aren&apos;t showing right now.
            </p>
          )}
          {weekend && !anyRealFares && (
            <p className="mt-3 rounded-2xl border border-surface-border bg-surface p-3 text-xs text-muted">
              {isFlightSearchConfigured()
                ? "No nonstop flights found for this weekend."
                : "No live fares — set SERPAPI_API_KEY to search real nonstop prices."}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option, i) => (
          <DestinationFareCard
            key={option.key}
            option={option}
            best={i === bestIndex}
            imageUrl={imageUrls[i]}
          />
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
