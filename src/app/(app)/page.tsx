import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import CollapsibleSection from "@/components/collapsible-section";
import LastSeenBanner from "@/components/last-seen-banner";
import MonthCalendar from "@/components/month-calendar";
import PlannedTripsSection from "@/components/planned-trips-section";
import PtoHolidaysSection from "@/components/pto-holidays-section";
import WeekendCard from "@/components/weekend-card";
import { getFionaPtoBalance } from "@/lib/actions/pto";
import { ensureAutoSyncedCalendars } from "@/lib/auto-sync";
import { getAvailabilitySnapshot, getUpcomingWeekends } from "@/lib/availability";
import { listPlannedTrips } from "@/lib/planned-trips";
import { PEOPLE } from "@/lib/people";
import { upcomingPtoSuggestions } from "@/lib/pto-suggestions";
import { getLastSeenInfo } from "@/lib/visits";

export const dynamic = "force-dynamic";

function parseMonthParam(value: string | undefined): Date {
  if (value) {
    const [year, month] = value.split("-").map(Number);
    if (year && month) return new Date(year, month - 1, 1);
  }
  return startOfMonth(new Date());
}

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
  const lastSeenInfo = getLastSeenInfo(snapshot);
  const ptoBalance = await getFionaPtoBalance();
  const ptoSuggestions = upcomingPtoSuggestions(snapshot);
  const plannedTrips = await listPlannedTrips();

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
        prevHref={`/?month=${format(subMonths(currentMonth, 1), "yyyy-MM")}`}
        nextHref={`/?month=${format(addMonths(currentMonth, 1), "yyyy-MM")}`}
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
