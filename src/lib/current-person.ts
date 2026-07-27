import { prisma } from "@/lib/db";
import { getActiveProfileId } from "@/lib/session";

// Throws if the database is unreachable; callers render their own fallback UI
// (see the (app) layout's DB-unavailable banner for the pattern to follow).
export async function getCurrentPerson() {
  const people = await prisma.person.findMany({
    orderBy: { createdAt: "asc" },
  });
  if (people.length === 0) return null;

  const activeProfileId = await getActiveProfileId();
  return people.find((p) => p.id === activeProfileId) ?? people[0];
}
