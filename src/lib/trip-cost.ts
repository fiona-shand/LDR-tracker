// A weekend trip is Friday-Sunday: 2 nights, 3 days (see availability.ts).
const TRIP_NIGHTS = 2;
const TRIP_DAYS = 3;
const TRAVELERS = 2;

// Flat, clearly-labeled estimates -- not a real quote like the flight fares.
// One hotel room for the two of you; meals for both, every day of the trip.
export const ESTIMATED_HOTEL_PER_NIGHT_USD = 150;
export const ESTIMATED_FOOD_PER_PERSON_PER_DAY_USD = 60;

/** Estimated hotel + food for the trip. $0 hotel when staying at the other person's home. */
export function estimateGroundCost(isHomeStay: boolean): number {
  const hotel = isHomeStay ? 0 : ESTIMATED_HOTEL_PER_NIGHT_USD * TRIP_NIGHTS;
  const food = ESTIMATED_FOOD_PER_PERSON_PER_DAY_USD * TRAVELERS * TRIP_DAYS;
  return hotel + food;
}
