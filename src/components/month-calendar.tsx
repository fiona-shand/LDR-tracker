import { addDays, eachDayOfInterval, endOfMonth, format, isToday, startOfDay, startOfMonth } from "date-fns";
import Link from "next/link";
import { getBusyTitles, getDayStatus, type AvailabilitySnapshot } from "@/lib/availability";
import { PEOPLE } from "@/lib/people";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function MonthCalendar({
  month,
  snapshot,
}: {
  month: Date;
  snapshot: AvailabilitySnapshot;
}) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const leadingBlanks = start.getDay();
  const days = eachDayOfInterval({ start, end });
  const today = startOfDay(new Date());

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold">{format(month, "MMMM yyyy")}</p>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs text-muted">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const isPast = day < today;
          const dow = day.getDay();
          const isWeekendDay = dow === 0 || dow === 6;
          const status = getDayStatus(snapshot, day);
          const bothFreeWeekend = !isPast && isWeekendDay && status === "both-free";
          const isTodayCell = isToday(day);

          const dayEvents = PEOPLE.map((p) => ({
            name: p.name,
            titles: getBusyTitles(snapshot, p.id, day),
          })).filter((e) => e.titles.length > 0);
          const tooltip = dayEvents.map((e) => `${e.name}: ${e.titles.join(", ")}`).join(" · ") || undefined;

          const base = "relative flex h-9 items-center justify-center rounded-lg text-sm transition-all duration-150";

          if (bothFreeWeekend) {
            const saturdayIso = format(dow === 6 ? day : addDays(day, -1), "yyyy-MM-dd");
            return (
              <Link
                key={day.toISOString()}
                href={`/search?weekend=${saturdayIso}`}
                className={`${base} bg-gradient-to-br from-accent to-accent-2 font-semibold text-white shadow-sm hover:scale-110 hover:opacity-90 hover:shadow-md active:scale-95`}
              >
                {format(day, "d")}
              </Link>
            );
          }

          const statusClasses = isPast
            ? "text-muted/30"
            : status === "both-busy"
              ? "text-muted/50 line-through"
              : status === "one-busy"
                ? "bg-surface-border/40 text-muted"
                : "text-foreground";

          return (
            <div
              key={day.toISOString()}
              title={tooltip}
              className={`${base} ${statusClasses} ${isTodayCell ? "ring-1 ring-accent" : ""}`}
            >
              {format(day, "d")}
              {dayEvents.length > 0 && !isPast && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-accent" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
