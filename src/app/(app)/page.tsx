import { addMonths, format, subMonths } from "date-fns";
import CollapsibleSection from "@/components/collapsible-section";
import LastSeenBanner from "@/components/last-seen-banner";
import MonthCalendar from "@/components/month-calendar";
import PlannedTripsSection from "@/components/planned-trips-section";
import PtoHolidaysSection from "@/components/pto-holidays-section";
import WeekendCard from "@/components/weekend-card";
import { getFionaPtoBalance } from "@/lib/actions/pto";
import { ensureAutoSyncedCalendars } from "@/lib/auto-sync";
import { getAvailabilitySnapshot, getUpcomingWeekends } from "@/lib/availability";
import { formatMonthParam, parseMonthParam } from "@/lib/calendar-month";
import { listPlannedTrips } from "@/lib/planned-trips";
import { PEOPLE } from "@/lib/people";
import { upcomingPtoSuggestions } from "@/lib/pto-suggestions";
import { getLastSeenInfo } from "@/lib/visits";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;

  await ensureAutoSyncedCalendars();
  const snapshot = await getAvailabilitySnapshot();

  const currentMonth = parseMonthParam(monthParam);
  const isThisMonth = format(currentMonth, "yyyy-MM") === format(new Date(), "yyyy-MM");

  const weekends = getUpcomingWeekends(snapshot, 8);
  const ptoBalance = await getFionaPtoBalance();
  const ptoSuggestions = upcomingPtoSuggestions(snapshot);
  const plannedTrips = await listPlannedTrips();
  // Trip rows reach back before today; the snapshot doesn't, so past visits
  // are only visible when these are passed in.
  const lastSeenInfo = getLastSeenInfo(snapshot, plannedTrips);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-muted">
          {PEOPLE.map((p) => `${p.name} (${p.airport.iataCode})`).join(" & ")} —
          weekends highlighted below are free for both of you.
        </p>
      </div>

      <LastSeenBanner info={lastSeenInfo} />

      <MonthCalendar
        month={currentMonth}
        snapshot={snapshot}
        prevHref={`/?month=${formatMonthParam(subMonths(currentMonth, 1))}`}
        nextHref={`/?month=${formatMonthParam(addMonths(currentMonth, 1))}`}
        todayHref={isThisMonth ? undefined : "/"}
      />

      <CollapsibleSection title="Trips together">
        <PlannedTripsSection trips={plannedTrips} />
      </CollapsibleSection>

      <CollapsibleSection title="Upcoming weekends">
        <div className="grid gap-3 sm:grid-cols-2">
          {weekends.map((weekend) => (
            <WeekendCard key={weekend.saturday.toISOString()} weekend={weekend} />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Long weekends & holidays">
        <PtoHolidaysSection suggestions={ptoSuggestions} ptoBalance={ptoBalance} />
      </CollapsibleSection>
    </div>
  );
}
