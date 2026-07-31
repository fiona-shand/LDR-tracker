/**
 * Demo data for a local database, so a fresh checkout shows a working app
 * rather than an empty one: the known planned trips, a few saved destinations,
 * some chosen interests, and a PTO balance.
 *
 *   npm run db:demo
 *
 * LOCAL ONLY. This is kept out of `prisma/seed.ts` on purpose -- that runs via
 * `prisma db seed` and has to stay safe to point at production, so it seeds
 * people and PTO rows and nothing else. Don't run this against Supabase; it
 * would overwrite real interests and PTO with sample values.
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { CATALOG } from "../src/lib/interests";
import { ensurePlannedTripsSeeded } from "../src/lib/planned-trips";
import { FIONA } from "../src/lib/people";

const SAVED_DESTINATIONS = ["BOS", "KEF", "LIS", "DUB"];
const CHOSEN_INTERESTS = ["food", "history", "cosy"];
const PTO_DAYS = 15;

async function main() {
  if (process.env.DATABASE_URL?.includes("supabase")) {
    console.error(
      "Refusing to run: DATABASE_URL looks like Supabase.\n" +
        "This seeds sample interests and PTO, which would overwrite real values.\n" +
        "For production you want `npm run db:backfill` instead.",
    );
    process.exitCode = 1;
    return;
  }

  // Also backfills each trip's destination, which the fairness ledger needs.
  await ensurePlannedTripsSeeded();

  for (const iataCode of SAVED_DESTINATIONS) {
    const city = CATALOG.find((c) => c.iataCode === iataCode);
    if (!city) continue;
    await prisma.destination.upsert({
      where: { iataCode },
      update: { interests: city.interests },
      create: { iataCode, cityName: city.cityName, interests: city.interests },
    });
  }

  await prisma.preferences.upsert({
    where: { id: "singleton" },
    update: { interests: CHOSEN_INTERESTS },
    create: { id: "singleton", interests: CHOSEN_INTERESTS },
  });

  await prisma.ptoBalance.upsert({
    where: { personId: FIONA.id },
    update: { currentDays: PTO_DAYS },
    create: { personId: FIONA.id, currentDays: PTO_DAYS },
  });

  const [trips, destinations] = await Promise.all([
    prisma.trip.count(),
    prisma.destination.count(),
  ]);

  console.log(
    `Demo data ready: ${trips} trips, ${destinations} destinations, ` +
      `interests [${CHOSEN_INTERESTS.join(", ")}], ${PTO_DAYS} PTO days for ${FIONA.name}.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
