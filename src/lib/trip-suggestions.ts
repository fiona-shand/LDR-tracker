import { differenceInCalendarDays, startOfDay } from "date-fns";
import { getTogetherIntervals, type AvailabilitySnapshot, type WeekendAvailability } from "@/lib/availability";

/** Flag a free weekend as worth booking once a gap since the last trip together passes this. */
const GAP_THRESHOLD_WEEKS = 6;

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
  if (!weekend.available) return false;

  const today = startOfDay(new Date());
  const intervals = getTogetherIntervals(snapshot);
  const priorEnd =
    intervals
      .filter((iv) => iv.end < weekend.friday)
      .reduce<Date | null>((latest, iv) => (!latest || iv.end > latest ? iv.end : latest), null) ??
    today;

  const weeksSincePrior = differenceInCalendarDays(weekend.friday, priorEnd) / 7;
  return weeksSincePrior > GAP_THRESHOLD_WEEKS;
}
