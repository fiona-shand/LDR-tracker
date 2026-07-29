import { addDays, format, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { PEOPLE } from "@/lib/people";
import { PLANNED_TRIPS_LABEL } from "@/lib/planned-trips";

type PersonId = (typeof PEOPLE)[number]["id"];

const HORIZON_DAYS = 200;

export type AvailabilitySnapshot = {
  busyDates: Record<PersonId, Set<string>>;
  busyEvents: Record<PersonId, Record<string, string[]>>;
  /** "real" = has a genuinely synced calendar. A manually-added planned trip
   * can still mark specific days busy for an "unconnected" person -- it just
   * doesn't tell us anything about the rest of their calendar. */
  sources: Record<PersonId, "real" | "unconnected">;
  /** Dates from the "Planned trips" connection specifically -- a reliable
   * "we're together" signal regardless of how the trip was titled. */
  togetherDates: Set<string>;
};

async function getPersonData(personId: PersonId): Promise<{
  dates: Set<string>;
  events: Record<string, string[]>;
  source: "real" | "unconnected";
  togetherDates: Set<string>;
}> {
  try {
    const today = startOfDay(new Date());
    const horizonEnd = addDays(today, HORIZON_DAYS);

    const [realConnection, blocks] = await Promise.all([
      prisma.calendarConnection.findFirst({
        where: { personId, provider: "ICS", icsUrl: { not: null } },
      }),
      prisma.busyBlock.findMany({
        where: { personId, startsAt: { lte: horizonEnd }, endsAt: { gte: today } },
        select: {
          startsAt: true,
          endsAt: true,
          title: true,
          calendarConnection: { select: { label: true } },
        },
      }),
    ]);

    const dates = new Set<string>();
    const events: Record<string, string[]> = {};
    const togetherDates = new Set<string>();
    for (const block of blocks) {
      const title = block.title?.trim() || "Busy";
      const isPlannedTogether = block.calendarConnection.label === PLANNED_TRIPS_LABEL;
      let cursor = startOfDay(block.startsAt);
      const end = startOfDay(block.endsAt);
      while (cursor <= end) {
        const iso = format(cursor, "yyyy-MM-dd");
        dates.add(iso);
        if (isPlannedTogether) togetherDates.add(iso);
        const forDay = (events[iso] ??= []);
        if (!forDay.includes(title)) forDay.push(title);
        cursor = addDays(cursor, 1);
      }
    }

    return { dates, events, source: realConnection ? "real" : "unconnected", togetherDates };
  } catch {
    return { dates: new Set(), events: {}, source: "unconnected", togetherDates: new Set() };
  }
}

export async function getAvailabilitySnapshot(): Promise<AvailabilitySnapshot> {
  const busyDates = {} as Record<PersonId, Set<string>>;
  const busyEvents = {} as Record<PersonId, Record<string, string[]>>;
  const sources = {} as Record<PersonId, "real" | "unconnected">;
  const togetherDates = new Set<string>();

  for (const person of PEOPLE) {
    const data = await getPersonData(person.id);
    busyDates[person.id] = data.dates;
    busyEvents[person.id] = data.events;
    sources[person.id] = data.source;
    for (const iso of data.togetherDates) togetherDates.add(iso);
  }

  return { busyDates, busyEvents, sources, togetherDates };
}

/** Whether this day is part of a recorded "we're together" trip. */
export function isTogetherDay(snapshot: AvailabilitySnapshot, date: Date): boolean {
  return snapshot.togetherDates.has(format(date, "yyyy-MM-dd"));
}

export type DateInterval = { start: Date; end: Date };

/** Merge togetherDates (individual days) into contiguous trip ranges. */
export function getTogetherIntervals(snapshot: AvailabilitySnapshot): DateInterval[] {
  const isoDates = Array.from(snapshot.togetherDates).sort();
  const intervals: DateInterval[] = [];

  for (const iso of isoDates) {
    const [year, month, day] = iso.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const last = intervals[intervals.length - 1];
    if (last && (date.getTime() - last.end.getTime()) / 86400000 <= 1) {
      last.end = date;
    } else {
      intervals.push({ start: date, end: date });
    }
  }

  return intervals;
}

/** Event titles (e.g. "Concert", "Trip to Rome") that make this person busy on this day. */
export function getBusyTitles(
  snapshot: AvailabilitySnapshot,
  personId: PersonId,
  date: Date,
): string[] {
  return snapshot.busyEvents[personId][format(date, "yyyy-MM-dd")] ?? [];
}

type PersonDayStatus = "free" | "busy" | "unknown";

/**
 * A specific known-busy day (real sync or a manually-added planned trip)
 * always reports "busy", even for someone without a connected calendar --
 * everything else is "unknown" until they connect one.
 */
function personDayStatus(
  snapshot: AvailabilitySnapshot,
  personId: PersonId,
  date: Date,
): PersonDayStatus {
  const busy = snapshot.busyDates[personId].has(format(date, "yyyy-MM-dd"));
  if (busy) return "busy";
  return snapshot.sources[personId] === "real" ? "free" : "unknown";
}

export type DayStatus = "both-free" | "one-busy" | "both-busy" | "unknown";

export function getDayStatus(snapshot: AvailabilitySnapshot, date: Date): DayStatus {
  const statuses = PEOPLE.map((p) => personDayStatus(snapshot, p.id, date));
  const busyCount = statuses.filter((s) => s === "busy").length;

  if (busyCount === PEOPLE.length) return "both-busy";
  if (busyCount > 0) return "one-busy";
  if (statuses.includes("unknown")) return "unknown";
  return "both-free";
}

function getNextOrCurrentSaturday(date: Date): Date {
  const day = date.getDay();
  const diff = (6 - day + 7) % 7;
  return addDays(date, diff);
}

export type WeekendAvailability = {
  friday: Date;
  saturday: Date;
  sunday: Date;
  bothFree: boolean;
  busyNames: string[];
  busyDetails: { name: string; titles: string[] }[];
  /** People with no calendar connected and no known-busy day this weekend. */
  unknownNames: string[];
};

// A "weekend trip" leaves Friday afternoon and returns Sunday, so Friday has
// to be free too, not just the Saturday/Sunday people usually mean by "weekend".
function weekendFor(snapshot: AvailabilitySnapshot, saturday: Date): WeekendAvailability {
  const friday = addDays(saturday, -1);
  const sunday = addDays(saturday, 1);
  const tripDays = [friday, saturday, sunday];

  const busyPeople = PEOPLE.filter((p) =>
    tripDays.some((d) => personDayStatus(snapshot, p.id, d) === "busy"),
  );
  const unknownPeople = PEOPLE.filter(
    (p) =>
      !busyPeople.includes(p) && tripDays.some((d) => personDayStatus(snapshot, p.id, d) === "unknown"),
  );
  const busyDetails = busyPeople.map((p) => ({
    name: p.name,
    titles: Array.from(new Set(tripDays.flatMap((d) => getBusyTitles(snapshot, p.id, d)))),
  }));

  return {
    friday,
    saturday,
    sunday,
    bothFree: unknownPeople.length === 0 && busyPeople.length === 0,
    busyNames: busyPeople.map((p) => p.name),
    busyDetails,
    unknownNames: unknownPeople.map((p) => p.name),
  };
}

export function getUpcomingWeekends(
  snapshot: AvailabilitySnapshot,
  count: number,
): WeekendAvailability[] {
  let saturday = getNextOrCurrentSaturday(startOfDay(new Date()));
  const weekends: WeekendAvailability[] = [];
  for (let i = 0; i < count; i++) {
    weekends.push(weekendFor(snapshot, saturday));
    saturday = addDays(saturday, 7);
  }
  return weekends;
}

export function getWeekendBySaturdayIso(
  snapshot: AvailabilitySnapshot,
  iso: string,
): WeekendAvailability | null {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  return weekendFor(snapshot, startOfDay(new Date(year, month - 1, day)));
}
