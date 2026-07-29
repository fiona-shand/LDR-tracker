import { prisma } from "@/lib/db";
import { FIONA, PEOPLE } from "@/lib/people";

type PlannedTrip = {
  id: string;
  title: string;
  /** Inclusive start/end dates. */
  startsAt: Date;
  endsAt: Date;
};

// Confirmed (or best-guess) upcoming visits, told directly by Fiona rather
// than pulled from a calendar sync. Exact dates are as given except where
// noted "assumed" -- correct those if the real dates differ.
export const PLANNED_TRIPS: PlannedTrip[] = [
  {
    id: "boston-2026-08",
    title: "Fiona & Jake in Boston",
    startsAt: new Date(2026, 7, 4),
    endsAt: new Date(2026, 7, 9),
  },
  {
    id: "london-2026-09",
    title: "Fiona & Jake in London",
    startsAt: new Date(2026, 8, 5),
    endsAt: new Date(2026, 8, 20),
  },
  {
    id: "minneapolis-2026-10",
    title: "Fiona & Jake in Minneapolis (assumed Oct 26 – Nov 1, \"last week of October\")",
    startsAt: new Date(2026, 9, 26),
    endsAt: new Date(2026, 10, 1),
  },
  {
    id: "london-2026-11-thanksgiving",
    title: "Fiona & Jake in London — Thanksgiving week (assumed Nov 23–29)",
    startsAt: new Date(2026, 10, 23),
    endsAt: new Date(2026, 10, 29),
  },
  {
    id: "minneapolis-2027-01",
    title: "Fiona & Jake in Minneapolis",
    startsAt: new Date(2027, 0, 15),
    endsAt: new Date(2027, 1, 8),
  },
];

export const PLANNED_TRIPS_LABEL = "Planned trips";

export type PlannedTripRow = {
  externalEventId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
};

/** Every recorded trip together, hardcoded seed and manually-added alike. */
export async function listPlannedTrips(): Promise<PlannedTripRow[]> {
  try {
    const connection = await prisma.calendarConnection.findFirst({
      where: { personId: FIONA.id, provider: "ICS", label: PLANNED_TRIPS_LABEL },
    });
    if (!connection) return [];

    const blocks = await prisma.busyBlock.findMany({
      where: { calendarConnectionId: connection.id },
      orderBy: { startsAt: "asc" },
      select: { externalEventId: true, title: true, startsAt: true, endsAt: true },
    });
    return blocks.map((b) => ({ ...b, title: b.title ?? "Trip together" }));
  } catch {
    return [];
  }
}

/**
 * One-time bootstrap for the known/confirmed upcoming visits, told directly
 * rather than pulled from a calendar sync. Not called automatically anymore
 * now that trips can be added/removed from the Calendar page -- re-run by
 * hand only if you need to restore these from scratch. Safe to re-run:
 * upserts by a stable id, so it won't duplicate or fight manual edits to
 * other trips.
 */
export async function ensurePlannedTripsSeeded() {
  for (const person of PEOPLE) {
    let connection = await prisma.calendarConnection.findFirst({
      where: { personId: person.id, provider: "ICS", label: PLANNED_TRIPS_LABEL },
    });
    if (!connection) {
      connection = await prisma.calendarConnection.create({
        data: { personId: person.id, provider: "ICS", label: PLANNED_TRIPS_LABEL },
      });
    }

    for (const trip of PLANNED_TRIPS) {
      await prisma.busyBlock.upsert({
        where: {
          calendarConnectionId_externalEventId: {
            calendarConnectionId: connection.id,
            externalEventId: trip.id,
          },
        },
        update: { title: trip.title, startsAt: trip.startsAt, endsAt: trip.endsAt },
        create: {
          personId: person.id,
          calendarConnectionId: connection.id,
          externalEventId: trip.id,
          title: trip.title,
          startsAt: trip.startsAt,
          endsAt: trip.endsAt,
          isAllDay: true,
        },
      });
    }
  }
}
