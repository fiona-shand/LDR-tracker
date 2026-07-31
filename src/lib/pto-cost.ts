import { addDays, format, startOfDay } from "date-fns";
import { optumHolidays } from "@/lib/us-holidays";

/**
 * What a chosen date range actually costs Fiona in PTO.
 *
 * This is the inverse of `pto-suggestions.ts`, where the window is an *output*
 * of holiday-bridging. Here the window is the input: you pick dates, this says
 * what they cost. That inversion is what makes "PTO maxxing" -- maximising days
 * together per PTO day -- expressible at all.
 *
 * Only Fiona's PTO is modelled; Jake is treated as having unlimited leave.
 */

/** Optum-observed holidays for the given years, as a set of "yyyy-MM-dd" keys. */
export function optumHolidaySet(years: number[]): Set<string> {
  const set = new Set<string>();
  for (const year of years) {
    for (const holiday of optumHolidays(year)) {
      set.add(format(holiday.date, "yyyy-MM-dd"));
    }
  }
  return set;
}

/** Holiday set covering every year the range touches, so callers can't under-cover it. */
export function holidaySetForRange(start: Date, end: Date): Set<string> {
  const years: number[] = [];
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) years.push(y);
  return optumHolidaySet(years);
}

function isWorkday(date: Date, holidaySet: Set<string>): boolean {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return false;
  return !holidaySet.has(format(date, "yyyy-MM-dd"));
}

/**
 * PTO days Fiona must spend to be away for [start, end] inclusive.
 *
 * Counts Mon-Fri days that aren't Optum holidays, with one deliberate
 * exception: **the departure day never costs PTO**. They fly out in the
 * evening ("leave friday night, then return sunday"), so that day is still
 * worked in full. A plain Fri-Sun weekend is therefore 0 PTO, not 1 --
 * getting this wrong inflates every single proposal by a day.
 *
 * The return day is charged normally: you can't fly home and work the same
 * day, so a Monday return does cost a PTO day.
 */
export function ptoDaysNeeded(start: Date, end: Date, holidaySet?: Set<string>): number {
  const from = startOfDay(start);
  const to = startOfDay(end);
  if (to < from) return 0;

  const holidays = holidaySet ?? holidaySetForRange(from, to);

  let count = 0;
  let cursor = addDays(from, 1); // departure day is worked, then flown out of
  while (cursor <= to) {
    if (isWorkday(cursor, holidays)) count++;
    cursor = addDays(cursor, 1);
  }
  return count;
}

/**
 * Days together per PTO day spent -- the "PTO maxxing" objective.
 * A zero-PTO trip is the best possible outcome, so it's scored against a
 * half-day floor rather than dividing by zero.
 */
export function ptoEfficiency(days: number, ptoDays: number): number {
  return days / Math.max(ptoDays, 0.5);
}
