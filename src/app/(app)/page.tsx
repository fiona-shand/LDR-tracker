import Link from "next/link";
import { addMonths, format, subMonths } from "date-fns";
import { ArrowRight, CalendarDays, Check, Clock3, MapPin } from "lucide-react";
import MonthCalendar from "@/components/month-calendar";
import PlanSidePanel from "@/components/plan-side-panel";
import { getAvailabilitySnapshot } from "@/lib/availability";
import { formatMonthParam, parseMonthParam } from "@/lib/calendar-month";
import { listPlannedTrips } from "@/lib/planned-trips";
import { upcomingPtoSuggestions } from "@/lib/pto-suggestions";
import { buildTripPlan, type TripProposal } from "@/lib/trip-planner";

export const dynamic = "force-dynamic";

function proposalDate(proposal: TripProposal) {
  return `${format(proposal.window.start, "EEE d")} – ${format(proposal.window.end, "EEE d MMM")}`;
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const snapshot = await getAvailabilitySnapshot();
  const [plan, visits] = await Promise.all([
    buildTripPlan(snapshot, 5, false),
    listPlannedTrips(),
  ]);
  const timeOff = upcomingPtoSuggestions(snapshot).slice(0, 4);
  const currentMonth = parseMonthParam(monthParam);
  const isThisMonth = format(currentMonth, "yyyy-MM") === format(new Date(), "yyyy-MM");
  const [best, ...alternatives] = plan.proposals;

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-sm font-medium text-accent">Your next visit</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          {best ? best.title : "Let’s find the next open weekend"}
        </h1>
      </header>

      {best ? (
        <section className="rounded-3xl border border-accent/30 bg-surface p-5 shadow-sm sm:p-7">
          <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
            <div>
              <p className="flex items-center gap-2 text-lg font-medium">
                <CalendarDays className="h-5 w-5 text-accent" />
                {proposalDate(best)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent">
                  {best.window.days} days together
                </span>
                <span className="rounded-full bg-background px-3 py-1.5 text-sm text-muted">
                  {best.window.ptoDays === 0 ? "No PTO" : `${best.window.ptoDays} PTO days`}
                </span>
                <span className="rounded-full bg-background px-3 py-1.5 text-sm text-muted">
                  ~${best.groundCost.toFixed(0)} before flights
                </span>
              </div>
              <ul className="mt-5 space-y-2">
                {best.reasons.slice(0, 3).map((reason) => (
                  <li key={reason} className="flex items-start gap-2 text-sm text-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex min-w-36 items-center gap-2 text-sm text-muted">
              <MapPin className="h-4 w-4" />
              {best.destination.cityName}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-surface-border bg-surface p-6 text-sm text-muted">
          Fiona&apos;s calendar has no open trip window yet. Check the calendar below or
          update visits and preferences in Settings.
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,.95fr)] lg:items-start">
        <MonthCalendar
          compact
          month={currentMonth}
          snapshot={snapshot}
          prevHref={`/?month=${formatMonthParam(subMonths(currentMonth, 1))}`}
          nextHref={`/?month=${formatMonthParam(addMonths(currentMonth, 1))}`}
          todayHref={isThisMonth ? undefined : "/"}
        />

        <PlanSidePanel
          alternatives={
            alternatives.length > 0 ? (
              <ul className="divide-y divide-surface-border">
                {alternatives.slice(0, 4).map((proposal) => (
                  <li key={proposal.key} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{proposal.title}</p>
                        <p className="mt-0.5 text-xs text-muted">{proposalDate(proposal)}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted">
                        {proposal.window.ptoDays === 0 ? "No PTO" : `${proposal.window.ptoDays} PTO`}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No other open windows yet.</p>
            )
          }
          visits={
            <div>
              {visits.length > 0 ? (
                <ul className="space-y-3">
                  {visits.slice(0, 4).map((visit) => (
                    <li key={visit.externalEventId}>
                      <p className="text-sm font-medium">{visit.title}</p>
                      <p className="text-xs text-muted">
                        {format(visit.startsAt, "MMM d")} – {format(visit.endsAt, "MMM d, yyyy")}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No visits logged yet.</p>
              )}
              <Link href="/settings#visits" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
                Log or edit visits <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          }
          timeOff={
            timeOff.length > 0 ? (
              <ul className="space-y-3">
                {timeOff.map((window) => (
                  <li key={window.holidayName} className="flex gap-3">
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div>
                      <p className="text-sm font-medium">{window.holidayName}</p>
                      <p className="text-xs text-muted">
                        {format(window.windowStart, "MMM d")} – {format(window.windowEnd, "MMM d")}
                        {" · "}{window.ptoDaysNeeded} PTO
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No open holiday windows right now.</p>
            )
          }
        />
      </div>
    </div>
  );
}
