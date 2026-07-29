import { prisma } from "@/lib/db";
import { PEOPLE } from "@/lib/people";

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

/**
 * Makes sure the known/confirmed upcoming visits are recorded as busy time
 * for both people, so the calendar and weekend suggestions treat those dates
 * as already spoken for instead of suggesting new trips over them. Manually
 * declared (not calendar-synced), and safe to re-run -- upserts by a stable
 * id so editing PLANNED_TRIPS above updates existing rows instead of
 * duplicating them.
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
