import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { AvailabilitySnapshot, WeekendAvailability } from "@/lib/availability";

/** Flag a free weekend as worth booking once a gap since the last trip together passes this. */
const GAP_THRESHOLD_WEEKS = 6;

type Interval = { start: Date; end: Date };

/** Merge togetherDates (individual days) into contiguous trip blocks. */
function mergedTogetherIntervals(snapshot: AvailabilitySnapshot): Interval[] {
  const isoDates = Array.from(snapshot.togetherDates).sort();
  const intervals: Interval[] = [];

  for (const iso of isoDates) {
    const [year, month, day] = iso.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const last = intervals[intervals.length - 1];
    if (last && differenceInCalendarDays(date, last.end) <= 1) {
      last.end = date;
    } else {
      intervals.push({ start: date, end: date });
    }
  }

  return intervals;
}

/**
 * Whether a free Friday-Sunday weekend is worth highlighting as a suggestion:
 * more than 6 weeks will have passed since the last trip together (or, with
 * nothing booked yet, since today) by the time this weekend arrives, and
 * both of you are actually free. A weekend shortly before an already-planned
 * future trip doesn't count as "nothing booked" -- that gap is spoken for.
 */
export function isSuggestedWeekend(
  snapshot: AvailabilitySnapshot,
  weekend: WeekendAvailability,
): boolean {
  if (!weekend.bothFree) return false;

  const today = startOfDay(new Date());
  const intervals = mergedTogetherIntervals(snapshot);
  const priorEnd =
    intervals
      .filter((iv) => iv.end < weekend.friday)
      .reduce<Date | null>((latest, iv) => (!latest || iv.end > latest ? iv.end : latest), null) ??
    today;

  const weeksSincePrior = differenceInCalendarDays(weekend.friday, priorEnd) / 7;
  return weeksSincePrior > GAP_THRESHOLD_WEEKS;
}
