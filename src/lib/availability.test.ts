import { describe, expect, it } from "vitest";
import {
  getRangeAvailability,
  getTogetherIntervals,
  type AvailabilitySnapshot,
} from "@/lib/availability";

const d = (iso: string) => {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, m - 1, day);
};

function snapshot(overrides: Partial<AvailabilitySnapshot> = {}): AvailabilitySnapshot {
  return {
    busyDates: new Set(),
    busyEvents: {},
    source: "real",
    togetherDates: new Set(),
    ...overrides,
  };
}

describe("getRangeAvailability", () => {
  it("counts days inclusively and nights as one fewer", () => {
    const r = getRangeAvailability(snapshot(), d("2026-08-07"), d("2026-08-09"));
    expect(r.days).toBe(3);
    expect(r.nights).toBe(2);
  });

  it("reports an available range when Fiona is clear", () => {
    const r = getRangeAvailability(snapshot(), d("2026-08-07"), d("2026-08-09"));
    expect(r.available).toBe(true);
  });

  it("flags a range containing a known-busy day", () => {
    const s = snapshot({
      busyDates: new Set(["2026-08-08"]),
      busyEvents: { "2026-08-08": ["Wedding"] },
    });
    const r = getRangeAvailability(s, d("2026-08-07"), d("2026-08-09"));
    expect(r.available).toBe(false);
    expect(r.busyNames).toEqual(["Fiona"]);
    expect(r.busyDetails[0].titles).toEqual(["Wedding"]);
  });

  it("does not flag a busy day that falls just outside the range", () => {
    const s = snapshot({
      busyDates: new Set(["2026-08-10"]),
      busyEvents: { "2026-08-10": ["Wedding"] },
    });
    const r = getRangeAvailability(s, d("2026-08-07"), d("2026-08-09"));
    expect(r.available).toBe(true);
  });

  it("handles a long multi-week range", () => {
    const r = getRangeAvailability(snapshot(), d("2026-08-07"), d("2026-08-23"));
    expect(r.days).toBe(17);
  });
});

describe("getTogetherIntervals", () => {
  it("merges consecutive days into one interval", () => {
    const s = snapshot({
      togetherDates: new Set(["2026-08-07", "2026-08-08", "2026-08-09"]),
    });
    const intervals = getTogetherIntervals(s);
    expect(intervals).toHaveLength(1);
    expect(intervals[0].start).toEqual(d("2026-08-07"));
    expect(intervals[0].end).toEqual(d("2026-08-09"));
  });

  it("splits non-consecutive days into separate intervals", () => {
    const s = snapshot({ togetherDates: new Set(["2026-08-07", "2026-09-20"]) });
    expect(getTogetherIntervals(s)).toHaveLength(2);
  });

  it("stays contiguous across a DST fall-back boundary", () => {
    // US DST ends Sun 2026-11-01, making Sat->Sun 25h apart. The old
    // millisecond-based check split the trip here.
    const s = snapshot({
      togetherDates: new Set(["2026-10-31", "2026-11-01", "2026-11-02"]),
    });
    const intervals = getTogetherIntervals(s);
    expect(intervals).toHaveLength(1);
    expect(intervals[0].end).toEqual(d("2026-11-02"));
  });
});
