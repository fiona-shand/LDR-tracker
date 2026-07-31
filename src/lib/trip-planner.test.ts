import { describe, expect, it } from "vitest";
import type { AvailabilitySnapshot } from "@/lib/availability";
import { buildFairnessLedger, directionForDestination } from "@/lib/fairness";
import type { Interest } from "@/lib/interests";
import { buildDestinationPool, rankProposals } from "@/lib/trip-planner";
import { generateTripWindows } from "@/lib/trip-windows";

const d = (iso: string) => {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, m - 1, day);
};

const FROM = d("2026-08-03");

function snapshot(): AvailabilitySnapshot {
  return {
    busyDates: new Set(),
    busyEvents: {},
    source: "real",
    togetherDates: new Set(),
  };
}

function rank(opts: {
  interests?: Interest[];
  history?: { startsAt: Date; endsAt: Date; destinationIataCode: string }[];
  limit?: number;
} = {}) {
  const history = (opts.history ?? []).map((t) => ({
    ...t,
    direction: directionForDestination(t.destinationIataCode),
  }));
  return rankProposals({
    windows: generateTripWindows(snapshot(), { from: FROM, horizonDays: 120 }),
    pool: buildDestinationPool([]),
    chosenInterests: opts.interests ?? [],
    ledger: buildFairnessLedger(history),
    tripEnds: history,
    limit: opts.limit ?? 6,
  });
}

describe("rankProposals", () => {
  it("returns proposals even with no interests or history", () => {
    const { shortlist } = rank();
    expect(shortlist.length).toBe(6);
    expect(shortlist.every((p) => p.window.days >= 3)).toBe(true);
  });

  it("never repeats a destination or a departure date in the shortlist", () => {
    const { shortlist } = rank({ limit: 8 });
    const destinations = shortlist.map((p) => p.destination.iataCode);
    const starts = shortlist.map((p) => p.window.start.getTime());
    expect(new Set(destinations).size).toBe(destinations.length);
    expect(new Set(starts).size).toBe(starts.length);
  });

  it("prefers a home stay over a meet-in-the-middle for the SAME dates", () => {
    // Nothing forces this -- it falls out of hotel cost being per-night and
    // zero at someone's home. Compared within one window so length, cadence
    // and availability are held constant.
    const { ranked } = rank();
    const longWindow = ranked.find((p) => p.window.days >= 9)!.window;
    const sameWindow = ranked.filter(
      (p) =>
        p.window.start.getTime() === longWindow.start.getTime() &&
        p.window.days === longWindow.days,
    );

    const bestHomeStay = sameWindow.find((p) => p.destination.isHomeStay)!;
    const bestMeet = sameWindow.find((p) => !p.destination.isHomeStay)!;
    expect(bestHomeStay.score).toBeGreaterThan(bestMeet.score);
  });

  it("wants long home stays and short meet-in-the-middle trips", () => {
    // Fiona's actual pattern: "we typically do week long ones" at each other's
    // places, but "on a meet in the middle trip its expensive hotels so we do
    // long weekends". Neither is hardcoded -- both come out of the cost model.
    const { ranked } = rank();
    const bestLengthFor = (iata: string) =>
      ranked.find((p) => p.destination.iataCode === iata)!.window.days;

    expect(bestLengthFor("MSP")).toBeGreaterThanOrEqual(7); // visiting Fiona
    expect(bestLengthFor("LHR")).toBeGreaterThanOrEqual(7); // visiting Jake
    expect(bestLengthFor("BOS")).toBeLessThanOrEqual(5); // hotel city
    expect(bestLengthFor("KEF")).toBeLessThanOrEqual(5);
  });

  it("charges a long meet-in-the-middle far more ground cost than a short one", () => {
    const { ranked } = rank();
    const meets = ranked.filter((p) => !p.destination.isHomeStay);
    const short = meets.find((p) => p.window.days === 3)!;
    const long = meets.find(
      (p) => p.window.days >= 12 && p.destination.iataCode === short.destination.iataCode,
    );
    if (long) expect(long.groundCost).toBeGreaterThan(short.groundCost * 2);
  });

  it("promotes destinations matching the chosen interests", () => {
    const withSkiing = rank({ interests: ["skiing"] }).ranked;
    const skiTop = withSkiing.findIndex((p) => p.destination.interests.includes("skiing"));
    const neutral = rank().ranked;
    const skiNeutral = neutral.findIndex((p) => p.destination.interests.includes("skiing"));
    expect(skiTop).toBeLessThan(skiNeutral);
  });

  it("mentions matched interests in the reasons", () => {
    const { ranked } = rank({ interests: ["skiing"] });
    const skiOption = ranked.find((p) => p.destination.interests.includes("skiing"))!;
    expect(skiOption.reasons.some((r) => r.includes("skiing"))).toBe(true);
  });

  it("pushes trips that are too soon after the last one down the ranking", () => {
    // Last trip ended the day before the horizon starts, so the earliest
    // windows are far too soon and should not lead.
    const history = [
      { startsAt: d("2026-07-25"), endsAt: d("2026-08-02"), destinationIataCode: "BOS" },
    ];
    const { ranked } = rank({ history });
    const top = ranked[0];
    // Roughly 5-6 weeks after Aug 2 is early-to-mid September.
    expect(top.window.start.getTime()).toBeGreaterThan(d("2026-08-25").getTime());
  });

  it("favours visiting whoever is due a turn", () => {
    // Fiona has flown to London twice, so Jake owes a trip to Minneapolis.
    const history = [
      { startsAt: d("2026-02-01"), endsAt: d("2026-02-08"), destinationIataCode: "LHR" },
      { startsAt: d("2026-04-01"), endsAt: d("2026-04-08"), destinationIataCode: "LHR" },
    ];
    const { ranked } = rank({ history });
    const bestVisitFiona = ranked.find((p) => p.destination.iataCode === "MSP")!;
    const bestVisitJake = ranked.find((p) => p.destination.iataCode === "LHR")!;
    expect(bestVisitFiona.score).toBeGreaterThan(bestVisitJake.score);
    expect(bestVisitFiona.reasons.some((r) => r.includes("turn"))).toBe(true);
  });

  it("always explains a zero-PTO trip as such", () => {
    const { ranked } = rank();
    const free = ranked.find((p) => p.window.ptoDays === 0)!;
    expect(free.reasons[0]).toContain("no PTO");
  });

  it("scores every proposal between 0 and 1", () => {
    const { ranked } = rank({ interests: ["food", "nature"] });
    expect(ranked.every((p) => p.score >= 0 && p.score <= 1)).toBe(true);
  });
});
