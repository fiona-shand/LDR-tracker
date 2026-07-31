"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { PEOPLE } from "@/lib/people";
import { PLANNED_TRIPS_LABEL } from "@/lib/planned-trips";

async function getOrCreateConnection(personId: string) {
  let connection = await prisma.calendarConnection.findFirst({
    where: { personId, provider: "ICS", label: PLANNED_TRIPS_LABEL },
  });
  if (!connection) {
    connection = await prisma.calendarConnection.create({
      data: { personId, provider: "ICS", label: PLANNED_TRIPS_LABEL },
    });
  }
  return connection;
}

export async function addPlannedTrip(formData: FormData) {
  const title = formData.get("title");
  const startsAtRaw = formData.get("startsAt");
  const endsAtRaw = formData.get("endsAt");
  const destinationRaw = formData.get("destinationIataCode");

  if (typeof title !== "string" || title.trim() === "") return;
  if (typeof startsAtRaw !== "string" || typeof endsAtRaw !== "string") return;

  const startsAt = new Date(`${startsAtRaw}T00:00:00`);
  const endsAt = new Date(`${endsAtRaw}T00:00:00`);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt < startsAt) return;

  const destinationIataCode =
    typeof destinationRaw === "string" && /^[A-Za-z]{3}$/.test(destinationRaw.trim())
      ? destinationRaw.trim().toUpperCase()
      : null;

  const externalEventId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    for (const person of PEOPLE) {
      const connection = await getOrCreateConnection(person.id);
      await prisma.busyBlock.create({
        data: {
          personId: person.id,
          calendarConnectionId: connection.id,
          externalEventId,
          title: title.trim(),
          startsAt,
          endsAt,
          isAllDay: true,
        },
      });
    }

    // Destination is optional -- a trip with no airport still blocks out the
    // dates, it just can't tell the fairness ledger who did the travelling.
    if (destinationIataCode) {
      await prisma.trip.create({
        data: { externalEventId, title: title.trim(), destinationIataCode, startsAt, endsAt },
      });
    }
  } catch {
    return;
  }

  revalidatePath("/");
  revalidatePath("/search");
}

export async function removePlannedTrip(formData: FormData) {
  const externalEventId = formData.get("externalEventId");
  if (typeof externalEventId !== "string") return;

  try {
    const connections = await prisma.calendarConnection.findMany({
      where: { provider: "ICS", label: PLANNED_TRIPS_LABEL },
      select: { id: true },
    });
    await prisma.busyBlock.deleteMany({
      where: { externalEventId, calendarConnectionId: { in: connections.map((c) => c.id) } },
    });
    await prisma.trip.deleteMany({ where: { externalEventId } });
  } catch {
    return;
  }

  revalidatePath("/");
  revalidatePath("/search");
}
