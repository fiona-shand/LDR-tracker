import { FIONA, JAKE } from "@/lib/people";
import { METRO_GROUPS } from "@/lib/metro-groups";

/**
 * Who has been doing the travelling, so the planner can nudge toward the
 * other person's turn.
 *
 * Deliberately narrow in scope: historical fares and flight durations were
 * never recorded, so a real cumulative "who has spent more money / more hours
 * in the air" ledger cannot be reconstructed. What CAN be counted reliably is
 * the direction of each trip. Live cost and flight-time balance for the trip
 * you're choosing right now is handled separately, from real fares.
 */

export type TravelDirection = "fiona-travels" | "jake-travels" | "both-travel";

export type TripDirectionRecord = {
  startsAt: Date;
  endsAt: Date;
  destinationIataCode: string;
  direction: TravelDirection;
};

function codesForHome(iataCode: string): Set<string> {
  const codes = new Set<string>([iataCode]);
  for (const group of METRO_GROUPS) {
    if (group.memberCodes.includes(iataCode)) {
      codes.add(group.code);
      for (const member of group.memberCodes) codes.add(member);
    }
  }
  return codes;
}

const FIONA_HOME_CODES = codesForHome(FIONA.airport.iataCode);
const JAKE_HOME_CODES = codesForHome(JAKE.airport.iataCode);

/**
 * Who flew, inferred from where the trip was.
 * Going to Jake's city means Fiona travelled, and vice versa. Anywhere else is
 * a meet-in-the-middle, where both of them fly.
 *
 * Uses metro groups so a trip into Gatwick counts as visiting Jake just as
 * much as one into Heathrow.
 */
export function directionForDestination(destinationIataCode: string): TravelDirection {
  const code = destinationIataCode.trim().toUpperCase();
  if (JAKE_HOME_CODES.has(code)) return "fiona-travels";
  if (FIONA_HOME_CODES.has(code)) return "jake-travels";
  return "both-travel";
}

export type FairnessLedger = {
  /** Trips where each person was the one getting on a long-haul flight. */
  fionaTravelled: number;
  jakeTravelled: number;
  bothTravelled: number;
  /** Direction of the most recent completed or booked trip, if any. */
  lastDirection: TravelDirection | null;
  /** Who is "due" to be the one travelling next. Null when it's genuinely even. */
  whoseTurn: "fiona" | "jake" | null;
};

export function buildFairnessLedger(trips: TripDirectionRecord[]): FairnessLedger {
  const sorted = [...trips].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  let fionaTravelled = 0;
  let jakeTravelled = 0;
  let bothTravelled = 0;

  for (const trip of sorted) {
    if (trip.direction === "fiona-travels") fionaTravelled++;
    else if (trip.direction === "jake-travels") jakeTravelled++;
    else bothTravelled++;
  }

  const lastDirection = sorted.length > 0 ? sorted[sorted.length - 1].direction : null;

  let whoseTurn: "fiona" | "jake" | null = null;
  if (fionaTravelled > jakeTravelled) whoseTurn = "jake";
  else if (jakeTravelled > fionaTravelled) whoseTurn = "fiona";
  else if (lastDirection === "fiona-travels") whoseTurn = "jake";
  else if (lastDirection === "jake-travels") whoseTurn = "fiona";

  return { fionaTravelled, jakeTravelled, bothTravelled, lastDirection, whoseTurn };
}

/**
 * Fairness score for a candidate destination, 0 to 1.
 *
 * A meet-in-the-middle is always even, so it scores well by default. Visiting
 * someone scores well when it's the traveller's turn and poorly when they went
 * last time.
 */
export function fairnessScore(
  destinationIataCode: string,
  ledger: FairnessLedger,
): number {
  const direction = directionForDestination(destinationIataCode);
  if (direction === "both-travel") return 0.75;

  const traveller = direction === "fiona-travels" ? "fiona" : "jake";
  if (ledger.whoseTurn === null) return 0.6;
  return ledger.whoseTurn === traveller ? 1 : 0.2;
}

/** Plain-language reason, for the "why this trip" line on a proposal card. */
export function fairnessReason(
  destinationIataCode: string,
  ledger: FairnessLedger,
): string | null {
  const direction = directionForDestination(destinationIataCode);
  if (direction === "both-travel") return "You both travel, so the trip splits evenly";
  if (ledger.whoseTurn === null) return null;

  const traveller = direction === "fiona-travels" ? FIONA : JAKE;
  const isTheirTurn = ledger.whoseTurn === (direction === "fiona-travels" ? "fiona" : "jake");
  return isTheirTurn
    ? `${traveller.name}'s turn to travel`
    : `${traveller.name} travelled last time`;
}
