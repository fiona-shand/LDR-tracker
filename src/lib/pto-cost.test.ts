import { describe, expect, it } from "vitest";
import { holidaySetForRange, ptoDaysNeeded, ptoEfficiency } from "@/lib/pto-cost";

// 2026 reference dates used below:
//   Fri 2026-08-07, Sat 2026-08-08, Sun 2026-08-09
//   Thu 2026-08-06 .. Mon 2026-08-10
//   Sat 2026-07-04 = Independence Day (falls on a Saturday in 2026)
//   Thu 2026-11-26 = Thanksgiving, Fri 2026-11-27 = Day after Thanksgiving
const d = (iso: string) => {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, m - 1, day);
};

describe("ptoDaysNeeded", () => {
  it("charges nothing for a plain Friday-to-Sunday weekend", () => {
    // They leave Friday evening after work, so the departure Friday is free.
    expect(ptoDaysNeeded(d("2026-08-07"), d("2026-08-09"))).toBe(0);
  });

  it("charges 2 days for a Thursday-to-Monday long weekend", () => {
    // Fly out Thu evening (worked), Fri + Mon cost PTO, Sat/Sun free.
    expect(ptoDaysNeeded(d("2026-08-06"), d("2026-08-10"))).toBe(2);
  });

  it("charges nothing for a single day, since it's the departure day", () => {
    expect(ptoDaysNeeded(d("2026-08-06"), d("2026-08-06"))).toBe(0);
  });

  it("charges the return day when it's a workday", () => {
    // Fri departure (free) through Mon return -- only the Monday costs.
    expect(ptoDaysNeeded(d("2026-08-07"), d("2026-08-10"))).toBe(1);
  });

  it("counts a full Friday-to-next-Sunday trip as one working week", () => {
    // Fri 7th (free, departure) + Mon-Fri 10th-14th (5) + weekends free.
    expect(ptoDaysNeeded(d("2026-08-07"), d("2026-08-16"))).toBe(5);
  });

  it("excludes Optum holidays from the count", () => {
    // Week containing Labor Day, Mon 2026-09-07.
    const withHoliday = ptoDaysNeeded(d("2026-09-04"), d("2026-09-13"));
    expect(withHoliday).toBe(4); // Mon is a holiday, so Tue-Fri only
  });

  it("makes Thanksgiving week cheap thanks to the two-day holiday block", () => {
    // Fri 2026-11-20 departure through Sun 2026-11-29.
    // Mon 23, Tue 24, Wed 25 cost PTO; Thu 26 + Fri 27 are Optum holidays.
    expect(ptoDaysNeeded(d("2026-11-20"), d("2026-11-29"))).toBe(3);
  });

  it("returns 0 for an inverted range rather than throwing", () => {
    expect(ptoDaysNeeded(d("2026-08-09"), d("2026-08-07"))).toBe(0);
  });

  it("covers holidays across a year boundary", () => {
    // Fri 2026-12-25 is Christmas; Fri 2027-01-01 is New Year's Day.
    const set = holidaySetForRange(d("2026-12-20"), d("2027-01-03"));
    expect(set.has("2026-12-25")).toBe(true);
    expect(set.has("2027-01-01")).toBe(true);
  });
});

describe("ptoEfficiency", () => {
  it("rewards a zero-PTO trip instead of dividing by zero", () => {
    expect(Number.isFinite(ptoEfficiency(3, 0))).toBe(true);
    expect(ptoEfficiency(3, 0)).toBe(6);
  });

  it("ranks more days per PTO day higher", () => {
    expect(ptoEfficiency(10, 5)).toBeGreaterThan(ptoEfficiency(6, 5));
  });
});
