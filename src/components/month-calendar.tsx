import { addDays, eachDayOfInterval, endOfMonth, format, isToday, startOfDay, startOfMonth } from "date-fns";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import {
  getBusyTitles,
  getDayStatus,
  getTogetherIntervals,
  getWeekendBySaturdayIso,
  isTogetherDay,
  type AvailabilitySnapshot,
  type DateInterval,
} from "@/lib/availability";
import { PEOPLE } from "@/lib/people";
import { isSuggestedWeekend } from "@/lib/trip-suggestions";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const CIRCLE = "flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full text-sm sm:text-base font-medium transition-transform duration-150";

/** Saturday of the Fri-Sun trip window this day belongs to, or null if it's not part of one. */
function saturdayForTripWindow(day: Date): Date | null {
  const dow = day.getDay();
  if (dow === 5) return addDays(day, 1); // Friday
  if (dow === 6) return day; // Saturday
  if (dow === 0) return addDays(day, -1); // Sunday
  return null;
}

function buildWeeks(days: Date[], leadingBlanks: number): (Date | null)[][] {
  const cells: (Date | null)[] = [...Array(leadingBlanks).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

type BarSegment = { key: string; colStart: number; colEnd: number; roundLeft: boolean; roundRight: boolean };

/** Together-trip bar segments touching this week row, clipped to its 7 columns. */
function barsForRow(week: (Date | null)[], intervals: DateInterval[]): BarSegment[] {
  const segments: BarSegment[] = [];
  for (const interval of intervals) {
    const cols = week.reduce<number[]>((acc, d, i) => {
      if (d && d.getTime() >= interval.start.getTime() && d.getTime() <= interval.end.getTime()) acc.push(i);
      return acc;
    }, []);
    if (cols.length === 0) continue;
    const colStart = Math.min(...cols);
    const colEnd = Math.max(...cols);
    segments.push({
      key: `${interval.start.getTime()}-${colStart}`,
      colStart,
      colEnd,
      roundLeft: week[colStart]!.getTime() === interval.start.getTime(),
      roundRight: week[colEnd]!.getTime() === interval.end.getTime(),
    });
  }
  return segments;
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
  const days = eachDayOfInterval({ start, end });
  const today = startOfDay(new Date());
  const weeks = buildWeeks(days, start.getDay());

  const unconnectedNames = PEOPLE.filter((p) => snapshot.sources[p.id] !== "real").map((p) => p.name);
  const togetherIntervals = getTogetherIntervals(snapshot);
  const togetherEndpoints = new Set<number>();
  for (const iv of togetherIntervals) {
    togetherEndpoints.add(iv.start.getTime());
    togetherEndpoints.add(iv.end.getTime());
  }

  function renderDay(day: Date) {
    const isPast = day < today;
    const status = getDayStatus(snapshot, day);
    const isTodayCell = isToday(day);
    const together = isTogetherDay(snapshot, day);
    const isEndpoint = togetherEndpoints.has(day.getTime());

    const tripSaturday = saturdayForTripWindow(day);
    const tripWeekend = tripSaturday
      ? getWeekendBySaturdayIso(snapshot, format(tripSaturday, "yyyy-MM-dd"))
      : null;
    const tripFree = !isPast && !together && !!tripWeekend?.bothFree;
    const suggested = tripFree && tripWeekend != null && isSuggestedWeekend(snapshot, tripWeekend);

    const dayEvents = PEOPLE.map((p) => ({ name: p.name, titles: getBusyTitles(snapshot, p.id, day) })).filter(
      (e) => e.titles.length > 0,
    );
    const tooltip =
      status === "unknown" && dayEvents.length === 0
        ? `${unconnectedNames.join(" & ")} ${unconnectedNames.length > 1 ? "haven't" : "hasn't"} connected a calendar`
        : dayEvents.map((e) => `${e.name}: ${e.titles.join(", ")}`).join(" · ") || undefined;

    const todayRing = isTodayCell ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : "";

    if (together) {
      if (!isEndpoint) {
        return (
          <div
            key={day.toISOString()}
            title={tooltip}
            className={`flex items-center justify-center py-1 text-sm font-medium text-foreground sm:text-base ${isPast ? "opacity-60" : ""}`}
          >
            {format(day, "d")}
          </div>
        );
      }
      return (
        <div key={day.toISOString()} title={tooltip} className={`flex items-center justify-center py-1 ${isPast ? "opacity-60" : ""}`}>
          <span className={`${CIRCLE} bg-day-together font-semibold text-day-together-ink ${todayRing}`}>
            {format(day, "d")}
          </span>
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
          className="flex items-center justify-center py-1"
        >
          <span
            className={`${CIRCLE} relative bg-day-free text-day-free-ink hover:scale-105 active:scale-95 ${todayRing} ${
              suggested ? "ring-2 ring-day-suggested-ink" : ""
            }`}
          >
            {format(day, "d")}
            {suggested && (
              <Star className="absolute -right-1 -top-1 h-3.5 w-3.5 fill-day-suggested-ink text-day-suggested-ink" />
            )}
          </span>
        </Link>
      );
    }

    const fillClasses = isPast
      ? "text-muted/40"
      : status === "unknown"
        ? "border border-dashed border-surface-border text-muted/70"
        : status === "both-busy" || status === "one-busy"
          ? "bg-day-busy text-day-busy-ink"
          : "text-foreground";

    return (
      <div key={day.toISOString()} title={tooltip} className="flex items-center justify-center py-1">
        <span className={`${CIRCLE} ${fillClasses} ${todayRing}`}>{format(day, "d")}</span>
      </div>
    );
  }

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
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        {weeks.map((week, weekIndex) => {
          const bars = barsForRow(week, togetherIntervals);
          return (
            <div key={weekIndex} className="relative">
              {bars.length > 0 && (
                <div className="pointer-events-none absolute inset-0 grid grid-cols-7 items-center">
                  {bars.map((seg) => (
                    <div
                      key={seg.key}
                      style={{ gridColumnStart: seg.colStart + 1, gridColumnEnd: seg.colEnd + 2 }}
                      className={`h-9 bg-day-together-bar sm:h-11 ${seg.roundLeft ? "rounded-l-full" : ""} ${
                        seg.roundRight ? "rounded-r-full" : ""
                      }`}
                    />
                  ))}
                </div>
              )}
              <div className="relative grid grid-cols-7">
                {week.map((day, i) => (day ? renderDay(day) : <div key={`blank-${weekIndex}-${i}`} />))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-surface-border pt-3 text-xs text-muted">
        <LegendSwatch className="bg-day-free" label="Free Fri–Sun" />
        <LegendSwatch className="bg-day-free ring-2 ring-day-suggested-ink" label="Suggested" />
        <LegendSwatch className="bg-day-together" label="Together" />
        <LegendSwatch className="bg-day-busy" label="One or both busy" />
        <LegendSwatch className="border border-dashed border-surface-border" label="Not connected" />
      </div>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3.5 w-3.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
