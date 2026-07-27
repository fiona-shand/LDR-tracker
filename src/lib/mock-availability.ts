import { addDays, format, startOfDay } from "date-fns";
import { PEOPLE } from "@/lib/people";

type PersonId = (typeof PEOPLE)[number]["id"];

// Busy ranges expressed as [offsetDaysStart, offsetDaysEnd] from today, inclusive.
// Placeholder data standing in for real calendar sync (tracked in issue #4).
const BUSY_OFFSETS: Record<PersonId, [number, number][]> = {
  fiona: [
    [5, 8],
    [26, 28],
    [54, 54],
    [82, 86],
  ],
  jake: [
    [12, 14],
    [33, 35],
    [47, 47],
    [70, 74],
  ],
};

function buildBusySet(personId: PersonId): Set<string> {
  const today = startOfDay(new Date());
  const dates = new Set<string>();
  for (const [start, end] of BUSY_OFFSETS[personId]) {
    for (let offset = start; offset <= end; offset++) {
      dates.add(format(addDays(today, offset), "yyyy-MM-dd"));
    }
  }
  return dates;
}

const BUSY_SETS: Record<PersonId, Set<string>> = {
  fiona: buildBusySet("fiona"),
  jake: buildBusySet("jake"),
};

export function isPersonFree(personId: PersonId, date: Date): boolean {
  return !BUSY_SETS[personId].has(format(date, "yyyy-MM-dd"));
}

export type DayStatus = "both-free" | "one-busy" | "both-busy";

export function getDayStatus(date: Date): DayStatus {
  const busyCount = PEOPLE.filter((p) => !isPersonFree(p.id, date)).length;
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

export function getUpcomingWeekends(count: number): WeekendAvailability[] {
  let saturday = getNextOrCurrentSaturday(startOfDay(new Date()));
  const weekends: WeekendAvailability[] = [];

  for (let i = 0; i < count; i++) {
    const sunday = addDays(saturday, 1);
    const busyNames = PEOPLE.filter(
      (p) => !isPersonFree(p.id, saturday) || !isPersonFree(p.id, sunday),
    ).map((p) => p.name);

    weekends.push({ saturday, sunday, bothFree: busyNames.length === 0, busyNames });
    saturday = addDays(saturday, 7);
  }

  return weekends;
}

export function getWeekendBySaturdayIso(iso: string): WeekendAvailability | null {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;

  const saturday = startOfDay(new Date(year, month - 1, day));
  const sunday = addDays(saturday, 1);
  const busyNames = PEOPLE.filter(
    (p) => !isPersonFree(p.id, saturday) || !isPersonFree(p.id, sunday),
  ).map((p) => p.name);

  return { saturday, sunday, bothFree: busyNames.length === 0, busyNames };
}
