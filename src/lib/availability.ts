import { addDays, format, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { PEOPLE } from "@/lib/people";
import { getMockBusyDates } from "@/lib/mock-availability";

type PersonId = (typeof PEOPLE)[number]["id"];

const HORIZON_DAYS = 200;

export type AvailabilitySnapshot = {
  busyDates: Record<PersonId, Set<string>>;
  sources: Record<PersonId, "real" | "mock">;
};

async function getRealBusyDates(personId: PersonId): Promise<Set<string> | null> {
  try {
    const connection = await prisma.calendarConnection.findFirst({
      where: { personId, provider: "ICS" },
    });
    if (!connection) return null;

    const today = startOfDay(new Date());
    const horizonEnd = addDays(today, HORIZON_DAYS);
    const blocks = await prisma.busyBlock.findMany({
      where: { personId, startsAt: { lte: horizonEnd }, endsAt: { gte: today } },
      select: { startsAt: true, endsAt: true },
    });

    const dates = new Set<string>();
    for (const block of blocks) {
      let cursor = startOfDay(block.startsAt);
      const end = startOfDay(block.endsAt);
      while (cursor <= end) {
        dates.add(format(cursor, "yyyy-MM-dd"));
        cursor = addDays(cursor, 1);
      }
    }
    return dates;
  } catch {
    return null;
  }
}

export async function getAvailabilitySnapshot(): Promise<AvailabilitySnapshot> {
  const busyDates = {} as Record<PersonId, Set<string>>;
  const sources = {} as Record<PersonId, "real" | "mock">;

  for (const person of PEOPLE) {
    const real = await getRealBusyDates(person.id);
    if (real) {
      busyDates[person.id] = real;
      sources[person.id] = "real";
    } else {
      busyDates[person.id] = getMockBusyDates(person.id);
      sources[person.id] = "mock";
    }
  }

  return { busyDates, sources };
}

function isFree(snapshot: AvailabilitySnapshot, personId: PersonId, date: Date): boolean {
  return !snapshot.busyDates[personId].has(format(date, "yyyy-MM-dd"));
}

export type DayStatus = "both-free" | "one-busy" | "both-busy";

export function getDayStatus(snapshot: AvailabilitySnapshot, date: Date): DayStatus {
  const busyCount = PEOPLE.filter((p) => !isFree(snapshot, p.id, date)).length;
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
};

function weekendFor(snapshot: AvailabilitySnapshot, saturday: Date): WeekendAvailability {
  const sunday = addDays(saturday, 1);
  const busyNames = PEOPLE.filter(
    (p) => !isFree(snapshot, p.id, saturday) || !isFree(snapshot, p.id, sunday),
  ).map((p) => p.name);
  return { saturday, sunday, bothFree: busyNames.length === 0, busyNames };
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
