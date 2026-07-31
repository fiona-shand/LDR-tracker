import { prisma } from "@/lib/db";
import { directionForDestination, type TripDirectionRecord } from "@/lib/fairness";
import { listPlannedTrips } from "@/lib/planned-trips";

/**
 * Recorded trips together, with a destination where we know one.
 *
 * Trips live as BusyBlock rows (which the availability engine reads) plus an
 * optional Trip metadata row carrying the destination. Blocks are joined to
 * metadata on the shared externalEventId that addPlannedTrip writes to both.
 *
 * Unlike the availability snapshot, this is NOT bounded to the next 200 days,
 * so finished trips are visible -- which is what the cadence and fairness
 * rules need.
 */
export async function listTripHistory(): Promise<TripDirectionRecord[]> {
  try {
    const [blocks, tripRows] = await Promise.all([
      listPlannedTrips(),
      prisma.trip.findMany({ orderBy: { startsAt: "asc" } }),
    ]);

    const byEventId = new Map(tripRows.map((t) => [t.externalEventId, t]));

    return blocks
      .map((block) => {
        const meta = byEventId.get(block.externalEventId);
        if (!meta) return null;
        return {
          startsAt: block.startsAt,
          endsAt: block.endsAt,
          destinationIataCode: meta.destinationIataCode,
          direction: directionForDestination(meta.destinationIataCode),
        };
      })
      .filter((t): t is TripDirectionRecord => t !== null);
  } catch {
    return [];
  }
}

/** End date of the most recent trip that finished on or before `before`. */
export function priorTripEnd(trips: { endsAt: Date }[], before: Date): Date | null {
  const ends = trips.map((t) => t.endsAt).filter((end) => end < before);
  if (ends.length === 0) return null;
  return ends.reduce((latest, end) => (end > latest ? end : latest));
}
