import { addDays, eachDayOfInterval, endOfMonth, format, isToday, startOfDay, startOfMonth } from "date-fns";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import {
  getBusyTitles,
  getDayStatus,
  getWeekendBySaturdayIso,
  isTogetherDay,
  type AvailabilitySnapshot,
} from "@/lib/availability";
import { PEOPLE } from "@/lib/people";
import { isSuggestedWeekend } from "@/lib/trip-suggestions";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Saturday of the Fri-Sun trip window this day belongs to, or null if it's not part of one. */
function saturdayForTripWindow(day: Date): Date | null {
  const dow = day.getDay();
  if (dow === 5) return addDays(day, 1); // Friday
  if (dow === 6) return day; // Saturday
  if (dow === 0) return addDays(day, -1); // Sunday
  return null;
}

export default function MonthCalendar({
  month,
  snapshot,
  prevHref,
  nextHref,
  todayHref,
}: {
  month: Date;
  snapshot: AvailabilitySnapshot;
  prevHref?: string;
  nextHref?: string;
  todayHref?: string;
}) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const leadingBlanks = start.getDay();
  const days = eachDayOfInterval({ start, end });
  const today = startOfDay(new Date());
  const unconnectedNames = PEOPLE.filter((p) => snapshot.sources[p.id] !== "real").map(
    (p) => p.name,
  );

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-lg font-semibold">{format(month, "MMMM yyyy")}</p>
        <div className="flex items-center gap-1">
          {todayHref && (
            <Link
              href={todayHref}
              className="mr-1 rounded-full border border-surface-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
            >
              Today
            </Link>
          )}
          {prevHref && (
            <Link
              href={prevHref}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          )}
          {nextHref && (
            <Link
              href={nextHref}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-xs text-muted">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label.slice(0, 3)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const isPast = day < today;
          const status = getDayStatus(snapshot, day);
          const isTodayCell = isToday(day);

          const together = isTogetherDay(snapshot, day);

          const tripSaturday = saturdayForTripWindow(day);
          const tripWeekend = tripSaturday
            ? getWeekendBySaturdayIso(snapshot, format(tripSaturday, "yyyy-MM-dd"))
            : null;
          const tripFree = !isPast && !together && !!tripWeekend?.bothFree;
          const suggested = tripFree && tripWeekend != null && isSuggestedWeekend(snapshot, tripWeekend);

          const dayEvents = PEOPLE.map((p) => ({
            name: p.name,
            titles: getBusyTitles(snapshot, p.id, day),
          })).filter((e) => e.titles.length > 0);
          const tooltip =
            status === "unknown"
              ? `${unconnectedNames.join(" & ")} ${unconnectedNames.length > 1 ? "haven't" : "hasn't"} connected a calendar`
              : dayEvents.map((e) => `${e.name}: ${e.titles.join(", ")}`).join(" · ") || undefined;

          const base =
            "relative flex h-12 sm:h-16 items-center justify-center rounded-xl text-sm sm:text-base transition-all duration-150";

          if (together) {
            return (
              <div
                key={day.toISOString()}
                title={tooltip}
                className={`${base} bg-gradient-to-br from-together to-together-2 font-semibold text-white shadow-sm ${isPast ? "opacity-50" : ""}`}
              >
                {format(day, "d")}
              </div>
            );
          }

          if (tripFree) {
            const saturdayIso = format(tripSaturday!, "yyyy-MM-dd");
            return (
              <Link
                key={day.toISOString()}
                href={`/search?weekend=${saturdayIso}`}
                title={
                  suggested
                    ? "Free Friday–Sunday — suggested, it's been a while since your last trip"
                    : "Free Friday–Sunday — plan a trip"
                }
                className={`${base} bg-gradient-to-br from-available to-available-2 font-semibold text-white shadow-sm hover:scale-105 hover:opacity-90 hover:shadow-md active:scale-95 ${suggested ? "ring-2 ring-offset-2 ring-offset-surface ring-amber-400" : ""}`}
              >
                {format(day, "d")}
                {suggested && (
                  <Star className="absolute right-1 top-1 h-3 w-3 fill-amber-300 text-amber-300" />
                )}
              </Link>
            );
          }

          const statusClasses = isPast
            ? "text-muted/30"
            : status === "unknown"
              ? "text-muted/40 border border-dashed border-surface-border"
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
                <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-accent" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-surface-border pt-3 text-xs text-muted">
        <LegendSwatch className="bg-gradient-to-br from-available to-available-2" label="Free Fri–Sun" />
        <LegendSwatch
          className="bg-gradient-to-br from-available to-available-2 ring-2 ring-amber-400"
          label="Suggested"
        />
        <LegendSwatch className="bg-gradient-to-br from-together to-together-2" label="Together" />
        <LegendSwatch className="bg-surface-border/60" label="One of you busy" />
        <LegendSwatch className="border border-dashed border-surface-border" label="Not connected" />
      </div>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded ${className}`} />
      {label}
    </span>
  );
}
