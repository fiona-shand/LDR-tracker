import { describe, expect, it } from "vitest";
import { cadenceFit } from "@/lib/cadence";

const d = (iso: string) => {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, m - 1, day);
};

describe("cadenceFit", () => {
  it("scores a trip 5-6 weeks after the last one as on-target", () => {
    const priorEnd = d("2026-08-09");
    expect(cadenceFit(d("2026-09-14"), priorEnd).verdict).toBe("on-target"); // ~5.0 weeks
    expect(cadenceFit(d("2026-09-20"), priorEnd).verdict).toBe("on-target"); // ~6.0 weeks
    expect(cadenceFit(d("2026-09-14"), priorEnd).score).toBe(1);
  });

  it("penalises a trip that is too soon", () => {
    const fit = cadenceFit(d("2026-08-23"), d("2026-08-09")); // 2 weeks
    expect(fit.verdict).toBe("too-soon");
    expect(fit.score).toBeLessThan(1);
  });

  it("penalises an overdue trip", () => {
    const fit = cadenceFit(d("2026-11-01"), d("2026-08-09")); // ~12 weeks
    expect(fit.verdict).toBe("overdue");
    expect(fit.score).toBeLessThan(1);
  });

  it("never lets an overdue trip score worse than a barely-there gap", () => {
    // A late trip still beats no trip; a same-week trip is the real miss.
    const veryLate = cadenceFit(d("2027-06-01"), d("2026-08-09"));
    const sameWeek = cadenceFit(d("2026-08-11"), d("2026-08-09"));
    expect(veryLate.score).toBeGreaterThan(sameWeek.score);
  });

  it("treats a missing prior trip as on-target rather than infinitely overdue", () => {
    const fit = cadenceFit(d("2026-09-14"), null);
    expect(fit.verdict).toBe("on-target");
    expect(fit.score).toBe(1);
  });

  it("scores strictly worse the further either side of the window you get", () => {
    const priorEnd = d("2026-08-09");
    const onTarget = cadenceFit(d("2026-09-16"), priorEnd).score;
    const slightlyLate = cadenceFit(d("2026-10-05"), priorEnd).score;
    const veryLate = cadenceFit(d("2026-12-05"), priorEnd).score;
    expect(onTarget).toBeGreaterThan(slightlyLate);
    expect(slightlyLate).toBeGreaterThan(veryLate);
  });
});
