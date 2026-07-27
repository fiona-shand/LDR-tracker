import { addDays, eachDayOfInterval, endOfMonth, format, isToday, startOfDay, startOfMonth } from "date-fns";
import Link from "next/link";
import { getDayStatus } from "@/lib/mock-availability";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function MonthCalendar({ month }: { month: Date }) {
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
          const status = getDayStatus(day);
          const bothFreeWeekend = !isPast && isWeekendDay && status === "both-free";
          const isTodayCell = isToday(day);

          const base = "flex h-9 items-center justify-center rounded-lg text-sm transition-colors";

          if (bothFreeWeekend) {
            const saturdayIso = format(dow === 6 ? day : addDays(day, -1), "yyyy-MM-dd");
            return (
              <Link
                key={day.toISOString()}
                href={`/search?weekend=${saturdayIso}`}
                className={`${base} bg-gradient-to-br from-accent to-accent-2 font-semibold text-white shadow-sm hover:opacity-90`}
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
              className={`${base} ${statusClasses} ${isTodayCell ? "ring-1 ring-accent" : ""}`}
            >
              {format(day, "d")}
            </div>
          );
        })}
      </div>
    </div>
  );
}
