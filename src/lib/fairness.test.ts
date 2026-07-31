import { describe, expect, it } from "vitest";
import {
  buildFairnessLedger,
  directionForDestination,
  fairnessScore,
  type TripDirectionRecord,
} from "@/lib/fairness";

const d = (iso: string) => {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, m - 1, day);
};

function trip(iso: string, destinationIataCode: string): TripDirectionRecord {
  return {
    startsAt: d(iso),
    endsAt: d(iso),
    destinationIataCode,
    direction: directionForDestination(destinationIataCode),
  };
}

describe("directionForDestination", () => {
  it("treats a trip to London as Fiona travelling", () => {
    expect(directionForDestination("LHR")).toBe("fiona-travels");
  });

  it("treats a trip to Minneapolis as Jake travelling", () => {
    expect(directionForDestination("MSP")).toBe("jake-travels");
  });

  it("treats a third city as both travelling", () => {
    expect(directionForDestination("BOS")).toBe("both-travel");
    expect(directionForDestination("KEF")).toBe("both-travel");
  });

  it("recognises other airports in the same metro area as home", () => {
    // Gatwick and the LON metro code are still 'visiting Jake'.
    expect(directionForDestination("LGW")).toBe("fiona-travels");
    expect(directionForDestination("LON")).toBe("fiona-travels");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(directionForDestination(" lhr ")).toBe("fiona-travels");
  });
});

describe("buildFairnessLedger", () => {
  it("counts trips by direction", () => {
    const ledger = buildFairnessLedger([
      trip("2026-01-10", "LHR"),
      trip("2026-03-10", "MSP"),
      trip("2026-05-10", "BOS"),
    ]);
    expect(ledger.fionaTravelled).toBe(1);
    expect(ledger.jakeTravelled).toBe(1);
    expect(ledger.bothTravelled).toBe(1);
  });

  it("says it is Jake's turn when Fiona has travelled more", () => {
    const ledger = buildFairnessLedger([trip("2026-01-10", "LHR"), trip("2026-03-10", "LHR")]);
    expect(ledger.whoseTurn).toBe("jake");
  });

  it("breaks an even tally using who went last", () => {
    const ledger = buildFairnessLedger([
      trip("2026-01-10", "MSP"), // Jake travelled
      trip("2026-03-10", "LHR"), // Fiona travelled most recently
    ]);
    expect(ledger.fionaTravelled).toBe(1);
    expect(ledger.jakeTravelled).toBe(1);
    expect(ledger.whoseTurn).toBe("jake");
  });

  it("uses trip dates, not array order, to find the most recent trip", () => {
    const ledger = buildFairnessLedger([
      trip("2026-03-10", "LHR"), // later, but listed first
      trip("2026-01-10", "MSP"),
    ]);
    expect(ledger.lastDirection).toBe("fiona-travels");
    expect(ledger.whoseTurn).toBe("jake");
  });

  it("has no opinion with no history", () => {
    const ledger = buildFairnessLedger([]);
    expect(ledger.whoseTurn).toBeNull();
    expect(ledger.lastDirection).toBeNull();
  });
});

describe("fairnessScore", () => {
  it("rewards visiting the person whose turn it is to be visited", () => {
    // Fiona has travelled twice, so it's Jake's turn to fly to her.
    const ledger = buildFairnessLedger([trip("2026-01-10", "LHR"), trip("2026-03-10", "LHR")]);
    expect(fairnessScore("MSP", ledger)).toBeGreaterThan(fairnessScore("LHR", ledger));
  });

  it("keeps meet-in-the-middle attractive regardless of history", () => {
    const lopsided = buildFairnessLedger([trip("2026-01-10", "LHR"), trip("2026-03-10", "LHR")]);
    expect(fairnessScore("BOS", lopsided)).toBeGreaterThan(fairnessScore("LHR", lopsided));
  });

  it("is neutral when there is no history to go on", () => {
    const empty = buildFairnessLedger([]);
    expect(fairnessScore("LHR", empty)).toBe(fairnessScore("MSP", empty));
  });
});
