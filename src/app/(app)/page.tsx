import { addMonths } from "date-fns";
import MonthCalendar from "@/components/month-calendar";
import WeekendCard from "@/components/weekend-card";
import CalendarConnect from "@/components/calendar-connect";
import { getAvailabilitySnapshot, getUpcomingWeekends } from "@/lib/availability";
import { PEOPLE } from "@/lib/people";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const snapshot = await getAvailabilitySnapshot();
  const today = new Date();
  const months = [0, 1, 2].map((offset) => addMonths(today, offset));
  const weekends = getUpcomingWeekends(snapshot, 8);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-muted">
          {PEOPLE.map((p) => `${p.name} (${p.airport.iataCode})`).join(" & ")} —
          weekends highlighted below are free for both of you.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
          Connect calendars
        </h2>
        <CalendarConnect snapshot={snapshot} />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {months.map((month) => (
          <MonthCalendar key={month.toISOString()} month={month} snapshot={snapshot} />
        ))}
      </div>

      <section>
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Upcoming weekends
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {weekends.map((weekend) => (
            <WeekendCard key={weekend.saturday.toISOString()} weekend={weekend} />
          ))}
        </div>
      </section>
    </div>
  );
}
