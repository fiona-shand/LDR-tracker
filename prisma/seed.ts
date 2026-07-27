import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PEOPLE } from "../src/lib/people";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TIMEZONES: Record<string, string> = {
  fiona: "America/Chicago",
  jake: "Europe/London",
};

async function main() {
  for (const person of PEOPLE) {
    await prisma.person.upsert({
      where: { id: person.id },
      update: { name: person.name, timezone: TIMEZONES[person.id] },
      create: {
        id: person.id,
        name: person.name,
        timezone: TIMEZONES[person.id] ?? "UTC",
      },
    });

    await prisma.ptoBalance.upsert({
      where: { personId: person.id },
      update: {},
      create: { personId: person.id, currentDays: 0 },
    });
  }

  console.log("Seeded people:", PEOPLE.map((p) => p.name).join(", "));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
