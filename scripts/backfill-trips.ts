/**
 * Record where each seeded trip took place, so the fairness ledger can work
 * out who has been doing the travelling.
 *
 * Run this once after applying the trip-planner migration -- including against
 * production. Trips are stored as BusyBlock rows, which carry dates but no
 * destination; without a matching Trip row the ledger has nothing to count and
 * reads 0/0/0.
 *
 *   npm run db:backfill
 *   DATABASE_URL="<supabase url>" npm run db:backfill
 *
 * Safe to re-run: it upserts by trip id and only touches the known seed trips.
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { backfillSeedTripDestinations } from "../src/lib/planned-trips";
import { directionForDestination } from "../src/lib/fairness";
import { FIONA, JAKE } from "../src/lib/people";

const DIRECTION_LABEL: Record<string, string> = {
  "fiona-travels": `${FIONA.name} travels`,
  "jake-travels": `${JAKE.name} travels`,
  "both-travel": "both travel",
};

async function main() {
  await backfillSeedTripDestinations();

  const trips = await prisma.trip.findMany({ orderBy: { startsAt: "asc" } });
  if (trips.length === 0) {
    console.log("No trips recorded.");
    return;
  }

  console.log(`Recorded ${trips.length} trip${trips.length === 1 ? "" : "s"}:\n`);
  for (const trip of trips) {
    const when = trip.startsAt.toISOString().slice(0, 10);
    const direction = DIRECTION_LABEL[directionForDestination(trip.destinationIataCode)];
    console.log(`  ${when}  ${trip.destinationIataCode}  ${direction.padEnd(14)} ${trip.title}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
