import { addMonths } from "date-fns";
import MonthCalendar from "@/components/month-calendar";
import WeekendCard from "@/components/weekend-card";
import { getUpcomingWeekends } from "@/lib/mock-availability";
import { PEOPLE } from "@/lib/people";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  const today = new Date();
  const months = [0, 1, 2].map((offset) => addMonths(today, offset));
  const weekends = getUpcomingWeekends(8);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-muted">
          {PEOPLE.map((p) => `${p.name} (${p.airport.iataCode})`).join(" & ")} —
          weekends highlighted below are free for both of you.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {months.map((month) => (
          <MonthCalendar key={month.toISOString()} month={month} />
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
