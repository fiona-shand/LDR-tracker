import { addDays, format, startOfDay } from "date-fns";
import type { AvailabilitySnapshot } from "@/lib/availability";
import { FIONA } from "@/lib/people";
import { usFederalHolidays } from "@/lib/us-holidays";

export type PtoSuggestion = {
  holidayName: string;
  holidayDate: Date;
  windowStart: Date;
  windowEnd: Date;
  ptoDaysNeeded: number;
};

/**
 * How many PTO days (and which window) turns a US holiday into a long
 * weekend, by bridging it to the nearest Saturday/Sunday. Only Fiona's PTO
 * is tracked -- Jake has unlimited time off, so he's never the constraint.
 */
function bridgeWindow(holiday: Date): { start: Date; end: Date; ptoDaysNeeded: number } {
  const dow = holiday.getDay(); // 0 Sun ... 6 Sat

  if (dow === 6) return { start: holiday, end: addDays(holiday, 2), ptoDaysNeeded: 0 }; // Sat
  if (dow === 0) return { start: addDays(holiday, -1), end: holiday, ptoDaysNeeded: 0 }; // Sun
  if (dow === 5) return { start: holiday, end: addDays(holiday, 2), ptoDaysNeeded: 0 }; // Fri -> Fri-Sun free already
  if (dow === 1) return { start: addDays(holiday, -3), end: holiday, ptoDaysNeeded: 1 }; // Mon -> take Fri off
  if (dow === 4) return { start: holiday, end: addDays(holiday, 3), ptoDaysNeeded: 1 }; // Thu -> take Fri off
  if (dow === 2) return { start: addDays(holiday, -3), end: holiday, ptoDaysNeeded: 1 }; // Tue -> take Mon off
  return { start: addDays(holiday, -4), end: holiday, ptoDaysNeeded: 2 }; // Wed -> take Mon+Tue off
}

/**
 * Upcoming US holidays worth planning a long-haul trip around, with the PTO
 * cost to extend each into a long weekend. Skips any holiday whose window
 * overlaps a day Fiona is already known to be busy (including an
 * already-planned trip), since that time is already accounted for.
 */
export function upcomingPtoSuggestions(
  snapshot: AvailabilitySnapshot,
  monthsAhead = 12,
): PtoSuggestion[] {
  const today = startOfDay(new Date());
  const horizon = addDays(today, monthsAhead * 31);
  const years = [today.getFullYear(), today.getFullYear() + 1];
  const holidays = years.flatMap((y) => usFederalHolidays(y));

  return holidays
    .filter((h) => h.date >= today && h.date <= horizon)
    .map((h) => {
      const w = bridgeWindow(h.date);
      return {
        holidayName: h.name,
        holidayDate: h.date,
        windowStart: w.start,
        windowEnd: w.end,
        ptoDaysNeeded: w.ptoDaysNeeded,
      };
    })
    .filter((s) => {
      let cursor = s.windowStart;
      while (cursor <= s.windowEnd) {
        if (snapshot.busyDates[FIONA.id].has(format(cursor, "yyyy-MM-dd"))) return false;
        cursor = addDays(cursor, 1);
      }
      return true;
    });
}
