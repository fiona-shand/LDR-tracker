import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { FIONA } from "@/lib/people";
import { PLANNED_TRIPS_LABEL } from "@/lib/planned-trips";

const HORIZON_DAYS = 200;

export type AvailabilitySnapshot = {
  busyDates: Set<string>;
  busyEvents: Record<string, string[]>;
  source: "real" | "unconnected";
  /** Dates from the "Planned trips" connection specifically -- a reliable
   * "we're together" signal regardless of how the trip was titled. */
  togetherDates: Set<string>;
};

async function getFionaData(): Promise<{
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
        where: { personId: FIONA.id, provider: "ICS", icsUrl: { not: null } },
      }),
      prisma.busyBlock.findMany({
        where: { personId: FIONA.id, startsAt: { lte: horizonEnd }, endsAt: { gte: today } },
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
  const data = await getFionaData();
  return {
    busyDates: data.dates,
    busyEvents: data.events,
    source: data.source,
    togetherDates: data.togetherDates,
  };
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
    // Compare calendar days, not elapsed ms -- a DST fall-back boundary makes
    // consecutive days 25h apart, which would wrongly split a contiguous trip.
    if (last && differenceInCalendarDays(date, last.end) <= 1) {
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
  date: Date,
): string[] {
  return snapshot.busyEvents[format(date, "yyyy-MM-dd")] ?? [];
}

export function isFionaFree(snapshot: AvailabilitySnapshot, date: Date): boolean {
  return !snapshot.busyDates.has(format(date, "yyyy-MM-dd"));
}

export type DayStatus = "free" | "busy";

export function getDayStatus(snapshot: AvailabilitySnapshot, date: Date): DayStatus {
  return isFionaFree(snapshot, date) ? "free" : "busy";
}

function getNextOrCurrentSaturday(date: Date): Date {
  const day = date.getDay();
  const diff = (6 - day + 7) % 7;
  return addDays(date, diff);
}

export type RangeAvailability = {
  start: Date;
  end: Date;
  /** Calendar days inclusive of both ends. */
  days: number;
  nights: number;
  available: boolean;
  busyNames: string[];
  busyDetails: { name: string; titles: string[] }[];
};

function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cursor = startOfDay(start);
  const last = startOfDay(end);
  while (cursor <= last) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

/**
 * Availability across an arbitrary date range, inclusive of both ends.
 * The weekend helpers below are a special case of this.
 */
export function getRangeAvailability(
  snapshot: AvailabilitySnapshot,
  start: Date,
  end: Date,
): RangeAvailability {
  const tripDays = eachDay(start, end);

  const busy = tripDays.some((date) => !isFionaFree(snapshot, date));
  const titles = Array.from(new Set(tripDays.flatMap((date) => getBusyTitles(snapshot, date))));

  return {
    start: startOfDay(start),
    end: startOfDay(end),
    days: tripDays.length,
    nights: Math.max(tripDays.length - 1, 0),
    available: !busy,
    busyNames: busy ? [FIONA.name] : [],
    busyDetails: busy ? [{ name: FIONA.name, titles }] : [],
  };
}

export type WeekendAvailability = {
  friday: Date;
  saturday: Date;
  sunday: Date;
  available: boolean;
  busyNames: string[];
  busyDetails: { name: string; titles: string[] }[];
};

// A "weekend trip" leaves Friday afternoon and returns Sunday, so Friday has
// to be free too, not just the Saturday/Sunday people usually mean by "weekend".
function weekendFor(snapshot: AvailabilitySnapshot, saturday: Date): WeekendAvailability {
  const friday = addDays(saturday, -1);
  const sunday = addDays(saturday, 1);
  const range = getRangeAvailability(snapshot, friday, sunday);

  return {
    friday,
    saturday,
    sunday,
    available: range.available,
    busyNames: range.busyNames,
    busyDetails: range.busyDetails,
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
