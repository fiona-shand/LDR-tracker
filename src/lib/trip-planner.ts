import { format } from "date-fns";
import { type AvailabilitySnapshot } from "@/lib/availability";
import { cadenceFit, type CadenceFit } from "@/lib/cadence";
import { getDestinations, type DestinationLike } from "@/lib/destinations-data";
import {
  buildFairnessLedger,
  fairnessReason,
  fairnessScore,
  type FairnessLedger,
} from "@/lib/fairness";
import { CATALOG, catalogInterests, interestMatch, type Interest } from "@/lib/interests";
import { FIONA, JAKE } from "@/lib/people";
import { getPreferences } from "@/lib/preferences";
import { estimateGroundCost } from "@/lib/trip-cost";
import { listTripHistory, priorTripEnd } from "@/lib/trip-history";
import { getCostTier } from "@/lib/travel-cost";
import { generateTripWindows, type TripWindow } from "@/lib/trip-windows";
import { searchCheapestFare } from "@/lib/flights";
import type { LegFare } from "@/lib/trip-options";

/**
 * Ranks concrete trip proposals -- a destination paired with a set of dates --
 * against the couple's actual rules: see each other every 5-6 weeks, get the
 * most days together per PTO day, split cost and travel fairly, and go
 * somewhere you both actually want to go.
 *
 * Scoring runs in two stages on purpose. Stage one scores every candidate with
 * no network calls at all; stage two fetches real fares for a small shortlist.
 * The naive alternative -- pricing every window against every destination --
 * would be thousands of SerpApi calls per page load against a 250/month quota.
 */

/** How many proposals get real fares fetched. Each costs 1-2 API searches. */
const SHORTLIST_SIZE = 6;

/** Days together saturates here -- a fortnight isn't twice as good as a week. */
const DAYS_SATURATION = 10;

/** PTO spend that drives the thrift term to zero. */
const PTO_REFERENCE = 10;

const WEIGHTS = {
  cadence: 0.25,
  days: 0.2,
  pto: 0.15,
  interest: 0.15,
  cost: 0.15,
  fairness: 0.1,
} as const;

/** Applied when we can't confirm both calendars are clear. */
const UNCONFIRMED_MULTIPLIER = 0.85;

export type ProposalDestination = {
  iataCode: string;
  cityName: string;
  interests: string[];
  isHomeStay: boolean;
  /** True when this came from the curated catalog rather than your saved list. */
  fromCatalog: boolean;
};

export type TripProposal = {
  key: string;
  title: string;
  window: TripWindow;
  destination: ProposalDestination;
  costTier: 1 | 2 | 3 | 4 | null;
  groundCost: number;
  cadence: CadenceFit;
  interestScore: number;
  score: number;
  reasons: string[];
  /** Populated only for the shortlist that gets real fares. */
  fares?: { fiona: LegFare; jake: LegFare; total: number | null };
  estimatedTotal: number | null;
};

const HOME: LegFare = { price: 0 };

function primaryCityWord(city: string): string {
  return city.split(/[\s–-]+/)[0] ?? city;
}

/**
 * Everywhere worth considering: the two home cities, your saved destinations,
 * and the curated catalog for places you haven't saved yet.
 */
function buildDestinationPool(saved: DestinationLike[]): ProposalDestination[] {
  const pool: ProposalDestination[] = [
    {
      iataCode: JAKE.airport.iataCode,
      cityName: primaryCityWord(JAKE.airport.city),
      interests: catalogInterests(JAKE.airport.iataCode),
      isHomeStay: true,
      fromCatalog: false,
    },
    {
      iataCode: FIONA.airport.iataCode,
      cityName: primaryCityWord(FIONA.airport.city),
      interests: catalogInterests(FIONA.airport.iataCode),
      isHomeStay: true,
      fromCatalog: false,
    },
  ];

  const seen = new Set(pool.map((p) => p.iataCode));

  for (const destination of saved) {
    if (seen.has(destination.iataCode)) continue;
    seen.add(destination.iataCode);
    pool.push({
      iataCode: destination.iataCode,
      cityName: destination.cityName,
      // Fall back to the catalog's editorial tags when a saved destination
      // hasn't been tagged yet, so it isn't unfairly scored as "no match".
      interests:
        destination.interests && destination.interests.length > 0
          ? destination.interests
          : catalogInterests(destination.iataCode),
      isHomeStay: false,
      fromCatalog: false,
    });
  }

  for (const city of CATALOG) {
    if (seen.has(city.iataCode)) continue;
    seen.add(city.iataCode);
    pool.push({
      iataCode: city.iataCode,
      cityName: city.cityName,
      interests: city.interests,
      isHomeStay: false,
      fromCatalog: true,
    });
  }

  return pool;
}

function titleFor(destination: ProposalDestination): string {
  if (destination.iataCode === JAKE.airport.iataCode) return `Visit ${JAKE.name}`;
  if (destination.iataCode === FIONA.airport.iataCode) return `Visit ${FIONA.name}`;
  return `Meet in ${destination.cityName}`;
}

function buildReasons(
  window: TripWindow,
  destination: ProposalDestination,
  cadence: CadenceFit,
  interestScore: number,
  chosenInterests: Interest[],
  ledger: FairnessLedger,
): string[] {
  const reasons: string[] = [];

  if (window.ptoDays === 0) {
    reasons.push(`${window.days} days together for no PTO`);
  } else {
    reasons.push(`${window.days} days together for ${window.ptoDays} PTO`);
  }

  if (cadence.verdict === "on-target") {
    reasons.push("Right on your 5-6 week rhythm");
  } else if (cadence.verdict === "overdue") {
    reasons.push(`${Math.round(cadence.weeksSincePrior)} weeks since the last trip`);
  }

  if (interestScore > 0 && chosenInterests.length > 0) {
    const matched = chosenInterests.filter((i) => destination.interests.includes(i));
    if (matched.length > 0) reasons.push(`Good for ${matched.join(" & ")}`);
  }

  const fairness = fairnessReason(destination.iataCode, ledger);
  if (fairness) reasons.push(fairness);

  if (window.availability.confidence === "unconfirmed") {
    const names = window.availability.unknownNames;
    if (names.length > 0) reasons.push(`${names.join(" & ")}'s calendar isn't connected`);
  }

  return reasons;
}

function normalise(value: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  return (value - min) / (max - min);
}

/**
 * Stage one: score every window/destination pair using only local data.
 * Ground cost carries the duration signal here -- hotel is charged per night
 * and is zero at someone's home, so long meet-in-the-middle trips are
 * penalised by their own hotel bill while long home stays are not.
 */
function scoreCandidates(
  windows: TripWindow[],
  pool: ProposalDestination[],
  chosenInterests: Interest[],
  ledger: FairnessLedger,
  tripEnds: { endsAt: Date }[],
): TripProposal[] {
  const rows = windows.flatMap((window) =>
    pool.map((destination) => {
      const costTier = getCostTier(destination.iataCode, destination.cityName);
      const groundCost = estimateGroundCost({
        isHomeStay: destination.isHomeStay,
        nights: window.nights,
        days: window.days,
        costTier,
      });
      return { window, destination, costTier, groundCost };
    }),
  );

  if (rows.length === 0) return [];

  const minCost = Math.min(...rows.map((r) => r.groundCost));
  const maxCost = Math.max(...rows.map((r) => r.groundCost));

  return rows.map((row) => {
    const cadence = cadenceFit(row.window.start, priorTripEnd(tripEnds, row.window.start));
    const interestScore = interestMatch(row.destination.interests, chosenInterests);

    const daysScore = Math.min(row.window.days / DAYS_SATURATION, 1);
    const ptoScore = Math.max(0, 1 - row.window.ptoDays / PTO_REFERENCE);
    const costScore = 1 - normalise(row.groundCost, minCost, maxCost);
    const fairness = fairnessScore(row.destination.iataCode, ledger);

    const raw =
      WEIGHTS.cadence * cadence.score +
      WEIGHTS.days * daysScore +
      WEIGHTS.pto * ptoScore +
      WEIGHTS.interest * interestScore +
      WEIGHTS.cost * costScore +
      WEIGHTS.fairness * fairness;

    const score =
      row.window.availability.confidence === "confirmed" ? raw : raw * UNCONFIRMED_MULTIPLIER;

    return {
      key: `${format(row.window.start, "yyyy-MM-dd")}-${row.window.days}-${row.destination.iataCode}`,
      title: titleFor(row.destination),
      window: row.window,
      destination: row.destination,
      costTier: row.costTier,
      groundCost: row.groundCost,
      cadence,
      interestScore,
      score,
      reasons: buildReasons(
        row.window,
        row.destination,
        cadence,
        interestScore,
        chosenInterests,
        ledger,
      ),
      estimatedTotal: null,
    } satisfies TripProposal;
  });
}

/**
 * Keep the ranking varied: at most one proposal per destination and one per
 * departure date, so the list isn't ten near-identical Boston weekends.
 */
function diversify(proposals: TripProposal[], limit: number): TripProposal[] {
  const seenDestinations = new Set<string>();
  const seenStarts = new Set<number>();
  const picked: TripProposal[] = [];

  for (const proposal of proposals) {
    if (picked.length >= limit) break;
    const start = proposal.window.start.getTime();
    if (seenDestinations.has(proposal.destination.iataCode) || seenStarts.has(start)) continue;
    seenDestinations.add(proposal.destination.iataCode);
    seenStarts.add(start);
    picked.push(proposal);
  }

  return picked;
}

async function faresFor(proposal: TripProposal): Promise<TripProposal> {
  const { window, destination } = proposal;

  const [fiona, jake] = await Promise.all([
    destination.iataCode === FIONA.airport.iataCode
      ? Promise.resolve(HOME)
      : searchCheapestFare({
          originIataCode: FIONA.airport.iataCode,
          destinationIataCode: destination.iataCode,
          departDate: window.start,
          returnDate: window.end,
        }).then((q) => (q ? { ...q } : { price: null })),
    destination.iataCode === JAKE.airport.iataCode
      ? Promise.resolve(HOME)
      : searchCheapestFare({
          originIataCode: JAKE.airport.iataCode,
          destinationIataCode: destination.iataCode,
          departDate: window.start,
          returnDate: window.end,
        }).then((q) => (q ? { ...q } : { price: null })),
  ]);

  const total = fiona.price != null && jake.price != null ? fiona.price + jake.price : null;

  return {
    ...proposal,
    fares: { fiona, jake, total },
    estimatedTotal: total == null ? null : total + proposal.groundCost,
  };
}

export type TripPlan = {
  proposals: TripProposal[];
  ledger: FairnessLedger;
  chosenInterests: Interest[];
  windowsConsidered: number;
  candidatesScored: number;
  destinationsError: boolean;
};

/**
 * The ranked plan shown on "Plan a trip".
 *
 * @param limit how many proposals to return with live fares attached.
 */
export async function buildTripPlan(
  snapshot: AvailabilitySnapshot,
  limit = SHORTLIST_SIZE,
): Promise<TripPlan> {
  const [{ destinations, error: destinationsError }, preferences, history] = await Promise.all([
    getDestinations(),
    getPreferences(),
    listTripHistory(),
  ]);

  const ledger = buildFairnessLedger(history);
  const windows = generateTripWindows(snapshot);
  const pool = buildDestinationPool(destinations);

  const scored = scoreCandidates(windows, pool, preferences.interests, ledger, history).sort(
    (a, b) => b.score - a.score,
  );

  const shortlist = diversify(scored, limit);
  // Only the shortlist hits the flight API -- see the two-stage note above.
  const priced = await Promise.all(shortlist.map(faresFor));

  // Re-rank on real money now that we have it, keeping unpriced options last.
  const proposals = priced.sort((a, b) => {
    if (a.estimatedTotal == null && b.estimatedTotal == null) return b.score - a.score;
    if (a.estimatedTotal == null) return 1;
    if (b.estimatedTotal == null) return -1;
    return b.score - a.score;
  });

  return {
    proposals,
    ledger,
    chosenInterests: preferences.interests,
    windowsConsidered: windows.length,
    candidatesScored: scored.length,
    destinationsError,
  };
}
