import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const fiona = await prisma.person.upsert({
    where: { id: "fiona" },
    update: {},
    create: { id: "fiona", name: "Fiona", timezone: "America/Los_Angeles" },
  });

  const partner = await prisma.person.upsert({
    where: { id: "partner" },
    update: {},
    create: { id: "partner", name: "Partner", timezone: "Europe/London" },
  });

  for (const person of [fiona, partner]) {
    await prisma.ptoBalance.upsert({
      where: { personId: person.id },
      update: {},
      create: { personId: person.id, currentDays: 0 },
    });
  }

  console.log("Seeded people:", fiona.name, partner.name);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
