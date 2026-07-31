import { addDays, startOfDay } from "date-fns";
import {
  getRangeAvailability,
  personDayStatus,
  type AvailabilitySnapshot,
  type RangeAvailability,
} from "@/lib/availability";
import { PEOPLE } from "@/lib/people";
import { holidaySetForRange, ptoDaysNeeded, ptoEfficiency } from "@/lib/pto-cost";

/**
 * Candidate trip windows: contiguous stretches where neither person is known
 * to be busy, sized to squeeze the most days together out of the fewest PTO
 * days.
 *
 * Entirely in-memory -- no network calls, no database. Pricing candidates is a
 * separate, deliberately much smaller step, because live fares cost API quota.
 */

/** Jake's three-week visit in May is the real precedent for the upper bound. */
export const MAX_TRIP_DAYS = 21;
const MIN_TRIP_DAYS = 3;

/** How far ahead to look. Matches the availability snapshot's own horizon. */
export const PLANNING_HORIZON_DAYS = 200;

/** Kept per anchor after Pareto pruning -- enough variety without a blowup. */
const WINDOWS_PER_ANCHOR = 4;

export type TripWindow = {
  start: Date;
  end: Date;
  days: number;
  nights: number;
  ptoDays: number;
  /** Days together per PTO day spent. */
  efficiency: number;
  availability: RangeAvailability;
};

function isBusyForAnyone(snapshot: AvailabilitySnapshot, date: Date): boolean {
  return PEOPLE.some((p) => personDayStatus(snapshot, p.id, date) === "busy");
}

function nextFridayOnOrAfter(date: Date): Date {
  const day = date.getDay();
  return addDays(date, (5 - day + 7) % 7);
}

/**
 * Keep only windows that aren't beaten outright: a window is dominated if
 * another gives at least as many days for no more PTO, and is strictly better
 * on one of the two. That leaves the genuine trade-offs and drops the rest.
 */
function paretoFrontier(windows: TripWindow[]): TripWindow[] {
  return windows.filter(
    (w) =>
      !windows.some(
        (other) =>
          other !== w &&
          other.days >= w.days &&
          other.ptoDays <= w.ptoDays &&
          (other.days > w.days || other.ptoDays < w.ptoDays),
      ),
  );
}

/**
 * Windows anchored on one Friday departure, grown outward through days nobody
 * is busy. Returns the non-dominated options, best efficiency first.
 */
function windowsForAnchor(
  snapshot: AvailabilitySnapshot,
  friday: Date,
  holidaySet: Set<string>,
  horizonEnd: Date,
): TripWindow[] {
  if (isBusyForAnyone(snapshot, friday)) return [];

  const candidates: TripWindow[] = [];

  // Grow the return date forward, one day at a time, stopping at the first day
  // either person is busy -- a trip can't span a known conflict.
  for (let length = MIN_TRIP_DAYS; length <= MAX_TRIP_DAYS; length++) {
    const end = addDays(friday, length - 1);
    if (end > horizonEnd) break;
    if (isBusyForAnyone(snapshot, end)) break;

    const ptoDays = ptoDaysNeeded(friday, end, holidaySet);
    candidates.push({
      start: friday,
      end,
      days: length,
      nights: length - 1,
      ptoDays,
      efficiency: ptoEfficiency(length, ptoDays),
      availability: getRangeAvailability(snapshot, friday, end),
    });
  }

  return paretoFrontier(candidates)
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, WINDOWS_PER_ANCHOR);
}

/**
 * Every candidate window across the planning horizon.
 *
 * Anchored on Fridays because that's how they actually travel -- out on Friday
 * evening after work, which is also what makes a plain weekend cost no PTO.
 */
export function generateTripWindows(
  snapshot: AvailabilitySnapshot,
  options: { from?: Date; horizonDays?: number } = {},
): TripWindow[] {
  const from = startOfDay(options.from ?? new Date());
  const horizonEnd = addDays(from, options.horizonDays ?? PLANNING_HORIZON_DAYS);
  const holidaySet = holidaySetForRange(from, addDays(horizonEnd, MAX_TRIP_DAYS));

  const windows: TripWindow[] = [];
  let friday = nextFridayOnOrAfter(from);

  while (friday <= horizonEnd) {
    windows.push(...windowsForAnchor(snapshot, friday, holidaySet, horizonEnd));
    friday = addDays(friday, 7);
  }

  return windows;
}
