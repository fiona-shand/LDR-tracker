import { describe, expect, it } from "vitest";
import type { AvailabilitySnapshot } from "@/lib/availability";
import { generateTripWindows, MAX_TRIP_DAYS } from "@/lib/trip-windows";

const d = (iso: string) => {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, m - 1, day);
};

function snapshot(busy: string[] = []): AvailabilitySnapshot {
  return {
    busyDates: new Set(busy),
    busyEvents: {},
    source: "real",
    togetherDates: new Set(),
  };
}

// Fri 2026-08-07 is the first Friday on/after this.
const FROM = d("2026-08-03");

describe("generateTripWindows", () => {
  it("produces windows when Fiona is available", () => {
    const windows = generateTripWindows(snapshot(), { from: FROM, horizonDays: 60 });
    expect(windows.length).toBeGreaterThan(0);
    expect(windows.every((w) => w.availability.available)).toBe(true);
  });

  it("anchors every window on a Friday departure", () => {
    const windows = generateTripWindows(snapshot(), { from: FROM, horizonDays: 90 });
    expect(windows.every((w) => w.start.getDay() === 5)).toBe(true);
  });

  it("always offers a zero-PTO weekend option", () => {
    const windows = generateTripWindows(snapshot(), { from: FROM, horizonDays: 30 });
    expect(windows.some((w) => w.ptoDays === 0 && w.days === 3)).toBe(true);
  });

  it("never spans a day either person is known busy", () => {
    // Fiona busy on Sun 2026-08-09 kills the first weekend outright.
    const windows = generateTripWindows(snapshot(["2026-08-09"]), {
      from: FROM,
      horizonDays: 30,
    });
    const spansBusyDay = windows.some(
      (w) => w.start <= d("2026-08-09") && w.end >= d("2026-08-09"),
    );
    expect(spansBusyDay).toBe(false);
  });

  it("drops an anchor entirely when the departure Friday is busy", () => {
    const windows = generateTripWindows(snapshot(["2026-08-07"]), {
      from: FROM,
      horizonDays: 20,
    });
    expect(windows.some((w) => w.start.getTime() === d("2026-08-07").getTime())).toBe(false);
  });

  it("never exceeds the maximum trip length", () => {
    const windows = generateTripWindows(snapshot(), { from: FROM, horizonDays: 200 });
    expect(windows.every((w) => w.days <= MAX_TRIP_DAYS)).toBe(true);
    expect(windows.every((w) => w.days >= 3)).toBe(true);
  });

  it("only keeps non-dominated windows within an anchor", () => {
    const windows = generateTripWindows(snapshot(), { from: FROM, horizonDays: 200 });
    const byAnchor = new Map<number, typeof windows>();
    for (const w of windows) {
      const key = w.start.getTime();
      byAnchor.set(key, [...(byAnchor.get(key) ?? []), w]);
    }

    for (const group of byAnchor.values()) {
      for (const w of group) {
        const dominated = group.some(
          (o) =>
            o !== w &&
            o.days >= w.days &&
            o.ptoDays <= w.ptoDays &&
            (o.days > w.days || o.ptoDays < w.ptoDays),
        );
        expect(dominated).toBe(false);
      }
    }
  });

  it("keeps the candidate set small enough to score without API calls", () => {
    const windows = generateTripWindows(snapshot(), { from: FROM, horizonDays: 200 });
    expect(windows.length).toBeLessThanOrEqual(150);
  });

  it("reports nights as one fewer than days", () => {
    const windows = generateTripWindows(snapshot(), { from: FROM, horizonDays: 30 });
    expect(windows.every((w) => w.nights === w.days - 1)).toBe(true);
  });

  it("finds a longer trip for the same PTO across a holiday weekend", () => {
    // Labor Day is Mon 2026-09-07, so the Fri 2026-09-04 anchor should reach
    // at least Monday without spending a PTO day.
    // leadDays: 0 so the Sep 4 anchor isn't filtered out by booking lead time.
    const windows = generateTripWindows(snapshot(), {
      from: d("2026-09-01"),
      horizonDays: 20,
      leadDays: 0,
    });
    const laborDay = windows.filter((w) => w.start.getTime() === d("2026-09-04").getTime());
    const freeOnes = laborDay.filter((w) => w.ptoDays === 0);
    expect(Math.max(...freeOnes.map((w) => w.days))).toBeGreaterThanOrEqual(4);
  });
});

describe("booking lead time", () => {
  it("does not propose leaving in the next few days", () => {
    const windows = generateTripWindows(snapshot(), { from: FROM, horizonDays: 60 });
    const earliest = Math.min(...windows.map((w) => w.start.getTime()));
    expect(earliest).toBeGreaterThanOrEqual(d("2026-08-10").getTime());
  });

  it("honours an explicit lead time", () => {
    const windows = generateTripWindows(snapshot(), {
      from: FROM,
      horizonDays: 60,
      leadDays: 0,
    });
    // With no lead time the very next Friday is fair game again.
    expect(Math.min(...windows.map((w) => w.start.getTime()))).toBe(d("2026-08-07").getTime());
  });
});
