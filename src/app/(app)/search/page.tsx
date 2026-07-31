import Link from "next/link";
import { addMonths, format, startOfMonth } from "date-fns";
import { Compass } from "lucide-react";
import DestinationFareCard from "@/components/destination-fare-card";
import TripProposalCard from "@/components/trip-proposal-card";
import WeekendDatePicker from "@/components/weekend-date-picker";
import CollapsibleSection from "@/components/collapsible-section";
import {
  getAvailabilitySnapshot,
  getWeekendBySaturdayIso,
  getUpcomingWeekends,
} from "@/lib/availability";
import { formatMonthParam, parseMonthParam } from "@/lib/calendar-month";
import { getDestinationImage } from "@/lib/destination-image";
import { isFlightSearchConfigured } from "@/lib/flights";
import { buildTripPlan } from "@/lib/trip-planner";
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

  // Recommendations are the main event; the weekend picker below is the
  // manual override for pricing a specific set of dates.
  const plan = await buildTripPlan(snapshot);
  const planImages = await Promise.all(
    plan.proposals.map((p) => getDestinationImage(p.destination.cityName)),
  );

  const upcomingWeekends = getUpcomingWeekends(snapshot, 40);
  const weekend =
    (weekendParam ? getWeekendBySaturdayIso(snapshot, weekendParam) : null) ??
    upcomingWeekends.find((w) => w.bothFree) ??
    upcomingWeekends[0] ??
    null;

  const todayMonth = startOfMonth(new Date());
  const maxMonth = addMonths(todayMonth, MONTHS_AHEAD - 1);
  const defaultMonth = weekend ? startOfMonth(weekend.saturday) : todayMonth;
  const currentMonth = monthParam ? parseMonthParam(monthParam) : defaultMonth;
  const prevMonth = addMonths(currentMonth, -1);
  const nextMonth = addMonths(currentMonth, 1);

  // Only price the manual weekend picker when someone actually picks a date --
  // otherwise every page load spends flight-API quota on it as well as the plan.
  const manualWeekend = weekendParam ? weekend : null;
  const { options, anyRealFares } = await buildTripOptions(manualWeekend);
  const bestIndex = options.findIndex((o) => o.total != null);
  const optionImages = await Promise.all(options.map((o) => getDestinationImage(o.cityName)));

  const { ledger } = plan;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Plan a trip</h1>
        <p className="mt-1 text-sm text-muted">
          Ranked by your rules: see each other every 5–6 weeks, get the most days
          together per PTO day, and keep cost and travel fair between{" "}
          {FIONA.airport.iataCode} and {JAKE.airport.iataCode}.
        </p>
      </div>

      {plan.chosenInterests.length === 0 && (
        <p className="rounded-2xl border border-surface-border bg-surface p-4 text-sm text-muted">
          <Compass className="mr-1.5 inline h-4 w-4 text-accent" />
          Pick what you&apos;re both into on the{" "}
          <Link href="/destinations" className="text-accent underline">
            Destinations page
          </Link>{" "}
          and these suggestions will match places to your interests.
        </p>
      )}

      {plan.proposals.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plan.proposals.map((proposal, i) => (
            <TripProposalCard
              key={proposal.key}
              proposal={proposal}
              best={i === 0}
              imageUrl={planImages[i]}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-surface-border bg-surface p-4 text-sm text-muted">
          No trip windows in the next few months — every weekend is blocked out on
          one of your calendars. Check the{" "}
          <Link href="/" className="text-accent underline">
            calendar
          </Link>{" "}
          for what&apos;s in the way.
        </p>
      )}

      <p className="text-xs text-muted">
        Considered {plan.windowsConsidered} date windows across {plan.candidatesScored}{" "}
        destination/date combinations, then fetched live nonstop fares for the top{" "}
        {plan.proposals.length}.
        {ledger.whoseTurn && (
          <>
            {" "}Travel so far: {FIONA.name} {ledger.fionaTravelled}, {JAKE.name}{" "}
            {ledger.jakeTravelled}
            {ledger.bothTravelled > 0 && `, ${ledger.bothTravelled} met in the middle`}.
          </>
        )}
      </p>

      <CollapsibleSection title="Price a specific weekend" defaultOpen={!!weekendParam}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <WeekendDatePicker
            snapshot={snapshot}
            month={currentMonth}
            selectedSaturdayIso={
              manualWeekend ? format(manualWeekend.saturday, "yyyy-MM-dd") : undefined
            }
            basePath="/search"
            prevHref={
              currentMonth > todayMonth ? `/search?month=${formatMonthParam(prevMonth)}` : undefined
            }
            nextHref={
              currentMonth < maxMonth ? `/search?month=${formatMonthParam(nextMonth)}` : undefined
            }
          />

          <div className="flex-1">
            {manualWeekend ? (
              <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-sm">
                <p className="text-sm text-muted">Weekend of</p>
                <p className="text-lg font-semibold">
                  {format(manualWeekend.friday, "EEE, MMM d")} –{" "}
                  {format(manualWeekend.sunday, "EEE, MMM d")}
                </p>
              </div>
            ) : (
              <p className="rounded-2xl border border-surface-border bg-surface p-4 text-sm text-muted">
                Pick a Friday, Saturday, or Sunday to compare fares to every destination
                for that weekend.
              </p>
            )}

            {manualWeekend && !anyRealFares && (
              <p className="mt-3 rounded-2xl border border-surface-border bg-surface p-3 text-xs text-muted">
                {isFlightSearchConfigured()
                  ? "No nonstop flights found for this weekend."
                  : "No live fares — set SERPAPI_API_KEY to search real nonstop prices."}
              </p>
            )}
          </div>
        </div>

        {manualWeekend && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {options.map((option, i) => (
              <DestinationFareCard
                key={option.key}
                option={option}
                best={i === bestIndex}
                imageUrl={optionImages[i]}
              />
            ))}
          </div>
        )}
      </CollapsibleSection>

      <Link
        href="/compare"
        className="text-sm font-medium text-accent underline underline-offset-2"
      >
        Compare cost &amp; flight time across destinations →
      </Link>
    </div>
  );
}
