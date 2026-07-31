import { differenceInCalendarDays, startOfDay } from "date-fns";

/**
 * The "see each other every 5-6 weeks" rule, in one place.
 *
 * This reconciles two constants that had drifted apart: `visits.ts` used a
 * single target of 5 weeks while `trip-suggestions.ts` used a 6-week gap
 * threshold. It's a range, not a point -- anywhere in it is on-target.
 */
export const CADENCE_MIN_WEEKS = 5;
export const CADENCE_MAX_WEEKS = 6;

export type CadenceFit = {
  weeksSincePrior: number;
  /** 1 = squarely on target, 0 = badly off. */
  score: number;
  verdict: "too-soon" | "on-target" | "overdue";
};

/**
 * How well a trip starting on `start` fits the cadence rule, given the end of
 * the previous trip together.
 *
 * Penalises **both** directions: a trip two weeks after the last one is as much
 * a miss as one four months later. Scoring only lateness would make the planner
 * pile trips up back-to-back and then call it a good fit.
 */
export function cadenceFit(
  start: Date,
  priorTripEnd: Date | null,
  minWeeks = CADENCE_MIN_WEEKS,
  maxWeeks = CADENCE_MAX_WEEKS,
): CadenceFit {
  // With no prior trip we have nothing to be early or late against -- treat
  // anything upcoming as on-target rather than inventing an infinite gap.
  if (!priorTripEnd) {
    return { weeksSincePrior: 0, score: 1, verdict: "on-target" };
  }

  const weeksSincePrior =
    differenceInCalendarDays(startOfDay(start), startOfDay(priorTripEnd)) / 7;

  if (weeksSincePrior >= minWeeks && weeksSincePrior <= maxWeeks) {
    return { weeksSincePrior, score: 1, verdict: "on-target" };
  }

  if (weeksSincePrior < minWeeks) {
    // Ramp from 0 at "same day as the last trip" up to 1 at the window's start.
    const score = Math.max(0, weeksSincePrior / minWeeks);
    return { weeksSincePrior, score, verdict: "too-soon" };
  }

  // Overdue decays gently -- being late is a real miss, but a late trip still
  // beats no trip, so this must never reach 0 the way "too soon" can.
  const weeksLate = weeksSincePrior - maxWeeks;
  const score = Math.max(0.25, 1 - weeksLate / 8);
  return { weeksSincePrior, score, verdict: "overdue" };
}
