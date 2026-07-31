import { describe, expect, it } from "vitest";
import { estimateGroundCost } from "@/lib/trip-cost";

describe("estimateGroundCost", () => {
  it("prices a weekend for a bare boolean caller", () => {
    // Home stay: 3 days of everyday spending for two, no hotel.
    expect(estimateGroundCost(true)).toBe(36 * 2 * 3);
    // Hotel trip: 2 nights hotel + 3 days food for two, at the tier-3 baseline.
    expect(estimateGroundCost(false)).toBe(660);
  });

  it("charges no hotel for a home stay however long the trip", () => {
    const short = estimateGroundCost({ isHomeStay: true, nights: 2, days: 3, costTier: 3 });
    const long = estimateGroundCost({ isHomeStay: true, nights: 13, days: 14, costTier: 3 });
    expect(long - short).toBe(36 * 2 * (14 - 3));
  });

  it("costs the same at either home, whatever the city's cost tier", () => {
    // Per Fiona: once they're there, London and Minneapolis cost them the same.
    const london = estimateGroundCost({ isHomeStay: true, nights: 9, days: 10, costTier: 4 });
    const minneapolis = estimateGroundCost({ isHomeStay: true, nights: 9, days: 10, costTier: 2 });
    expect(london).toBe(minneapolis);
  });

  it("keeps the per-day cost of a home stay well below a hotel trip", () => {
    // This gap is what makes long home stays worth it and long hotel trips not.
    const homePerDay = estimateGroundCost({ isHomeStay: true, nights: 9, days: 10, costTier: 3 }) / 10;
    const hotelPerDay = estimateGroundCost({ isHomeStay: false, nights: 9, days: 10, costTier: 3 }) / 10;
    expect(hotelPerDay).toBeGreaterThan(homePerDay * 2);
  });

  it("makes a long meet-in-the-middle far pricier than a long home stay", () => {
    // This is what steers the planner toward long stays at each other's places
    // and short meet-in-the-middle trips, with no rule for either.
    const homeStay = estimateGroundCost({ isHomeStay: true, nights: 13, days: 14, costTier: 3 });
    const meetInMiddle = estimateGroundCost({
      isHomeStay: false,
      nights: 13,
      days: 14,
      costTier: 3,
    });
    expect(meetInMiddle).toBeGreaterThan(homeStay * 1.5);
  });

  it("widens the gap the longer a meet-in-the-middle runs", () => {
    // The absolute gap is what the planner scores on, and it has to grow with
    // length -- that's what turns a long hotel trip into a bad deal while a
    // long weekend stays affordable.
    const shortGap =
      estimateGroundCost({ isHomeStay: false, nights: 2, days: 3, costTier: 3 }) -
      estimateGroundCost({ isHomeStay: true, nights: 2, days: 3, costTier: 3 });
    const longGap =
      estimateGroundCost({ isHomeStay: false, nights: 9, days: 10, costTier: 3 }) -
      estimateGroundCost({ isHomeStay: true, nights: 9, days: 10, costTier: 3 });
    expect(longGap).toBeGreaterThan(shortGap * 3);
  });

  it("scales with the destination cost tier", () => {
    const cheap = estimateGroundCost({ isHomeStay: false, nights: 3, days: 4, costTier: 1 });
    const pricey = estimateGroundCost({ isHomeStay: false, nights: 3, days: 4, costTier: 4 });
    expect(pricey).toBeGreaterThan(cheap);
  });

  it("treats an unknown cost tier as the baseline", () => {
    const unknown = estimateGroundCost({ isHomeStay: false, nights: 3, days: 4, costTier: null });
    const baseline = estimateGroundCost({ isHomeStay: false, nights: 3, days: 4, costTier: 3 });
    expect(unknown).toBe(baseline);
  });
});
