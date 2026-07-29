import { addDays, format, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { PEOPLE } from "@/lib/people";

type PersonId = (typeof PEOPLE)[number]["id"];

const HORIZON_DAYS = 200;

export type AvailabilitySnapshot = {
  busyDates: Record<PersonId, Set<string>>;
  busyEvents: Record<PersonId, Record<string, string[]>>;
  sources: Record<PersonId, "real" | "unconnected">;
};

async function getRealBusyData(
  personId: PersonId,
): Promise<{ dates: Set<string>; events: Record<string, string[]> } | null> {
  try {
    const connection = await prisma.calendarConnection.findFirst({
      where: { personId, provider: "ICS" },
    });
    if (!connection) return null;

    const today = startOfDay(new Date());
    const horizonEnd = addDays(today, HORIZON_DAYS);
    const blocks = await prisma.busyBlock.findMany({
      where: { personId, startsAt: { lte: horizonEnd }, endsAt: { gte: today } },
      select: { startsAt: true, endsAt: true, title: true },
    });

    const dates = new Set<string>();
    const events: Record<string, string[]> = {};
    for (const block of blocks) {
      const title = block.title?.trim() || "Busy";
      let cursor = startOfDay(block.startsAt);
      const end = startOfDay(block.endsAt);
      while (cursor <= end) {
        const iso = format(cursor, "yyyy-MM-dd");
        dates.add(iso);
        const forDay = (events[iso] ??= []);
        if (!forDay.includes(title)) forDay.push(title);
        cursor = addDays(cursor, 1);
      }
    }
    return { dates, events };
  } catch {
    return null;
  }
}

export async function getAvailabilitySnapshot(): Promise<AvailabilitySnapshot> {
  const busyDates = {} as Record<PersonId, Set<string>>;
  const busyEvents = {} as Record<PersonId, Record<string, string[]>>;
  const sources = {} as Record<PersonId, "real" | "unconnected">;

  for (const person of PEOPLE) {
    const real = await getRealBusyData(person.id);
    if (real) {
      busyDates[person.id] = real.dates;
      busyEvents[person.id] = real.events;
      sources[person.id] = "real";
    } else {
      // No calendar connected -- we genuinely don't know, so this person's
      // days are "unknown", never assumed free or busy.
      busyDates[person.id] = new Set();
      busyEvents[person.id] = {};
      sources[person.id] = "unconnected";
    }
  }

  return { busyDates, busyEvents, sources };
}

function isFree(snapshot: AvailabilitySnapshot, personId: PersonId, date: Date): boolean {
  return !snapshot.busyDates[personId].has(format(date, "yyyy-MM-dd"));
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

function personDayStatus(
  snapshot: AvailabilitySnapshot,
  personId: PersonId,
  date: Date,
): PersonDayStatus {
  if (snapshot.sources[personId] !== "real") return "unknown";
  return isFree(snapshot, personId, date) ? "free" : "busy";
}

export type DayStatus = "both-free" | "one-busy" | "both-busy" | "unknown";

export function getDayStatus(snapshot: AvailabilitySnapshot, date: Date): DayStatus {
  const statuses = PEOPLE.map((p) => personDayStatus(snapshot, p.id, date));
  if (statuses.includes("unknown")) return "unknown";
  const busyCount = statuses.filter((s) => s === "busy").length;
  if (busyCount === 0) return "both-free";
  if (busyCount === PEOPLE.length) return "both-busy";
  return "one-busy";
}

function getNextOrCurrentSaturday(date: Date): Date {
  const day = date.getDay();
  const diff = (6 - day + 7) % 7;
  return addDays(date, diff);
}

export type WeekendAvailability = {
  saturday: Date;
  sunday: Date;
  bothFree: boolean;
  busyNames: string[];
  busyDetails: { name: string; titles: string[] }[];
  /** People with no calendar connected -- their status for this weekend is unknown, not free. */
  unknownNames: string[];
};

function weekendFor(snapshot: AvailabilitySnapshot, saturday: Date): WeekendAvailability {
  const sunday = addDays(saturday, 1);

  const unknownPeople = PEOPLE.filter((p) => snapshot.sources[p.id] !== "real");
  const busyPeople = PEOPLE.filter(
    (p) =>
      snapshot.sources[p.id] === "real" &&
      (!isFree(snapshot, p.id, saturday) || !isFree(snapshot, p.id, sunday)),
  );
  const busyDetails = busyPeople.map((p) => ({
    name: p.name,
    titles: Array.from(
      new Set([
        ...getBusyTitles(snapshot, p.id, saturday),
        ...getBusyTitles(snapshot, p.id, sunday),
      ]),
    ),
  }));

  return {
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
