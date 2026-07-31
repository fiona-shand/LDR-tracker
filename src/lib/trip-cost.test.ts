import { describe, expect, it } from "vitest";
import { estimateGroundCost } from "@/lib/trip-cost";

describe("estimateGroundCost", () => {
  it("keeps the old weekend behaviour for a bare boolean caller", () => {
    // 2 nights hotel + 3 days food for two, at the tier-3 baseline.
    expect(estimateGroundCost(true)).toBe(360);
    expect(estimateGroundCost(false)).toBe(660);
  });

  it("charges no hotel for a home stay however long the trip", () => {
    const short = estimateGroundCost({ isHomeStay: true, nights: 2, days: 3, costTier: 3 });
    const long = estimateGroundCost({ isHomeStay: true, nights: 13, days: 14, costTier: 3 });
    // Food scales, but there's no hotel component in either.
    expect(long - short).toBe(60 * 2 * (14 - 3));
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

  it("narrows the gap for a short meet-in-the-middle", () => {
    const homeStay = estimateGroundCost({ isHomeStay: true, nights: 2, days: 3, costTier: 3 });
    const meetInMiddle = estimateGroundCost({ isHomeStay: false, nights: 2, days: 3, costTier: 3 });
    expect(meetInMiddle / homeStay).toBeLessThan(2);
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
