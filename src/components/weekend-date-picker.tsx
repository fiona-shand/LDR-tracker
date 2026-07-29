import { addDays, eachDayOfInterval, endOfMonth, format, isToday, startOfDay, startOfMonth } from "date-fns";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import {
  getWeekendBySaturdayIso,
  isTogetherDay,
  type AvailabilitySnapshot,
} from "@/lib/availability";
import { isSuggestedWeekend } from "@/lib/trip-suggestions";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const CELL = "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-transform duration-150";

/** Saturday of the Fri-Sun trip window this day belongs to, or null if it's not part of one. */
function saturdayForTripWindow(day: Date): Date | null {
  const dow = day.getDay();
  if (dow === 5) return addDays(day, 1);
  if (dow === 6) return day;
  if (dow === 0) return addDays(day, -1);
  return null;
}

function buildWeeks(days: Date[], leadingBlanks: number): (Date | null)[][] {
  const cells: (Date | null)[] = [...Array(leadingBlanks).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * A compact month calendar for picking a weekend to search, in the same
 * spirit as Skyscanner's date picker. Every Friday/Saturday/Sunday is
 * selectable regardless of known free/busy status -- with only one
 * calendar connected, most weekends can't be confirmed "free" yet, and
 * that shouldn't block searching a fare for them.
 */
export default function WeekendDatePicker({
  snapshot,
  month,
  selectedSaturdayIso,
  basePath,
  prevHref,
  nextHref,
}: {
  snapshot: AvailabilitySnapshot;
  month: Date;
  selectedSaturdayIso?: string;
  basePath: string;
  prevHref?: string;
  nextHref?: string;
}) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  const today = startOfDay(new Date());
  const weeks = buildWeeks(days, start.getDay());

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">{format(month, "MMMM yyyy")}</p>
        <div className="flex items-center gap-1">
          {prevHref && (
            <Link
              href={prevHref}
              aria-label="Previous month"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-accent"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          )}
          {nextHref && (
            <Link
              href={nextHref}
              aria-label="Next month"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-accent"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-[10px] text-muted">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i}>{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {weeks.flat().map((day, i) => {
          if (!day) return <div key={i} className={CELL} />;

          const isPast = day < today;
          const isTodayCell = isToday(day);
          const tripSaturday = saturdayForTripWindow(day);

          // Mon-Thu and past days aren't valid weekend-trip anchors -- not selectable.
          if (!tripSaturday || isPast) {
            return (
              <div
                key={i}
                className={`${CELL} ${isPast ? "text-muted/30" : "text-muted/60"} ${isTodayCell ? "ring-1 ring-accent" : ""}`}
              >
                {format(day, "d")}
              </div>
            );
          }

          const saturdayIso = format(tripSaturday, "yyyy-MM-dd");
          const tripWeekend = getWeekendBySaturdayIso(snapshot, saturdayIso);
          const free = !!tripWeekend?.bothFree;
          const together = isTogetherDay(snapshot, day);
          const busy = !free && !together && (tripWeekend?.busyNames.length ?? 0) > 0;
          const suggested = free && tripWeekend != null && isSuggestedWeekend(snapshot, tripWeekend);
          const selected = saturdayIso === selectedSaturdayIso;

          const fillClasses = selected
            ? "bg-accent text-white"
            : suggested
              ? "bg-day-suggested text-day-suggested-ink ring-2 ring-day-suggested-ink"
              : free
                ? "bg-day-free text-day-free-ink"
                : together
                  ? "bg-day-together text-day-together-ink"
                  : busy
                    ? "bg-day-busy text-day-busy-ink"
                    : "border border-dashed border-surface-border text-muted/70";

          const tooltip = suggested
            ? "Suggested — it's been a while since your last trip"
            : free
              ? "Free Friday–Sunday"
              : together
                ? "Together"
                : busy
                  ? `${tripWeekend!.busyNames.join(" & ")} busy`
                  : tripWeekend && tripWeekend.unknownNames.length > 0
                    ? `${tripWeekend.unknownNames.join(" & ")} ${tripWeekend.unknownNames.length > 1 ? "haven't" : "hasn't"} connected a calendar`
                    : undefined;

          return (
            <Link
              key={i}
              href={`${basePath}?weekend=${saturdayIso}`}
              title={tooltip}
              className={`${CELL} relative hover:scale-110 active:scale-95 ${fillClasses}`}
            >
              {format(day, "d")}
              {suggested && !selected && (
                <Star className="absolute -right-1 -top-1 h-2.5 w-2.5 fill-day-suggested-ink text-day-suggested-ink" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-surface-border pt-3 text-[11px] text-muted">
        <LegendDot className="bg-day-free" label="Free" />
        <LegendDot className="bg-day-suggested" label="Suggested" />
        <LegendDot className="bg-day-together" label="Together" />
        <LegendDot className="bg-day-busy" label="Busy" />
        <LegendDot className="border border-dashed border-surface-border" label="Unknown" />
        <LegendDot className="bg-accent" label="Selected" />
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
