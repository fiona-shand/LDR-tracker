const TRAVELERS = 2;

// Flat, clearly-labeled estimates -- not a real quote like the flight fares.
// One hotel room for the two of you; meals for both, every day of the trip.
export const ESTIMATED_HOTEL_PER_NIGHT_USD = 150;
export const ESTIMATED_FOOD_PER_PERSON_PER_DAY_USD = 60;

// A weekend trip is Friday-Sunday: 2 nights, 3 days (see availability.ts).
// Used as the default so existing weekend-only callers behave exactly as before.
const WEEKEND_NIGHTS = 2;
const WEEKEND_DAYS = 3;

/**
 * Cost tier (1 cheap - 4 expensive) scales hotel and food away from the flat
 * baseline, so a long stay in an expensive city is priced like one. Tier 3 is
 * treated as the baseline the flat estimates were written for.
 */
const TIER_MULTIPLIER: Record<1 | 2 | 3 | 4, number> = {
  1: 0.5,
  2: 0.75,
  3: 1,
  4: 1.4,
};

/**
 * What a day costs, per person, staying at each other's places.
 *
 * Flat, and deliberately NOT scaled by the city's cost tier: per Fiona, London
 * and Minneapolis cost them the same once they're there, because they're
 * cooking in and living normally rather than eating out at local restaurant
 * prices. Tier scaling only applies to hotel trips.
 */
const HOME_STAY_FOOD_PER_PERSON_PER_DAY_USD = 36;

export type GroundCostInput = {
  /** Staying at the other person's home -- no hotel needed. */
  isHomeStay: boolean;
  nights?: number;
  days?: number;
  costTier?: 1 | 2 | 3 | 4 | null;
};

/**
 * Estimated hotel + food for the trip. $0 hotel when staying at the other
 * person's home.
 *
 * Duration matters: hotel is charged per night, so a two-week meet-in-the-middle
 * carries two weeks of hotel while two weeks at Jake's carries none. That single
 * fact is what makes the planner naturally prefer long home stays and short
 * meet-in-the-middle trips, with no separate rule for either.
 */
export function estimateGroundCost(input: GroundCostInput | boolean): number {
  // Back-compat: older callers passed a bare `isHomeStay` boolean.
  const { isHomeStay, nights, days, costTier } =
    typeof input === "boolean" ? { isHomeStay: input, nights: undefined, days: undefined, costTier: undefined } : input;

  const tripNights = nights ?? WEEKEND_NIGHTS;
  const tripDays = days ?? WEEKEND_DAYS;
  const multiplier = TIER_MULTIPLIER[costTier ?? 3];

  if (isHomeStay) {
    // No hotel, and the same daily spend wherever "home" happens to be.
    return HOME_STAY_FOOD_PER_PERSON_PER_DAY_USD * TRAVELERS * tripDays;
  }

  const hotel = ESTIMATED_HOTEL_PER_NIGHT_USD * tripNights * multiplier;
  const food = ESTIMATED_FOOD_PER_PERSON_PER_DAY_USD * TRAVELERS * tripDays * multiplier;
  return hotel + food;
}
