import { addDays, format, startOfDay } from "date-fns";
import type { AvailabilitySnapshot } from "@/lib/availability";
import { optumHolidays, type Holiday } from "@/lib/us-holidays";

export type PtoSuggestion = {
  holidayName: string;
  holidayDate: Date;
  windowStart: Date;
  windowEnd: Date;
  ptoDaysNeeded: number;
};

const MAX_BRIDGE_PTO_PER_SIDE = 2;

function isFreeDay(date: Date, holidaySet: Set<string>): boolean {
  const dow = date.getDay();
  return dow === 0 || dow === 6 || holidaySet.has(format(date, "yyyy-MM-dd"));
}

/** Walk outward through consecutive free (weekend/holiday) days, at no PTO cost. */
function extendFreeRun(edge: Date, direction: 1 | -1, holidaySet: Set<string>): Date {
  let cursor = edge;
  while (isFreeDay(addDays(cursor, direction), holidaySet)) cursor = addDays(cursor, direction);
  return cursor;
}

/**
 * From the edge of an already-free run, try spending up to
 * MAX_BRIDGE_PTO_PER_SIDE PTO days on the workdays immediately beyond it to
 * reach the *next* free day -- then ride that free run for free. If it can't
 * be reached within budget, don't bridge at all (0 PTO, edge unchanged).
 */
function extendEdge(edge: Date, direction: 1 | -1, holidaySet: Set<string>): { edge: Date; pto: number } {
  let probe = addDays(edge, direction);
  let bridgeCost = 0;
  while (!isFreeDay(probe, holidaySet) && bridgeCost < MAX_BRIDGE_PTO_PER_SIDE) {
    bridgeCost++;
    probe = addDays(probe, direction);
  }

  if (!isFreeDay(probe, holidaySet)) return { edge, pto: 0 };

  return { edge: extendFreeRun(probe, direction, holidaySet), pto: bridgeCost };
}

/** Merge holidays that fall on consecutive calendar days into one block (e.g. Thanksgiving + the day after). */
function mergeAdjacentHolidays(holidays: Holiday[]): { name: string; start: Date; end: Date }[] {
  const sorted = [...holidays].sort((a, b) => a.date.getTime() - b.date.getTime());
  const blocks: { name: string; start: Date; end: Date }[] = [];

  for (const h of sorted) {
    const last = blocks[blocks.length - 1];
    if (last && format(addDays(last.end, 1), "yyyy-MM-dd") === format(h.date, "yyyy-MM-dd")) {
      last.end = h.date;
      last.name = `${last.name} + ${h.name}`;
    } else {
      blocks.push({ name: h.name, start: h.date, end: h.date });
    }
  }

  return blocks;
}

/**
 * Upcoming holidays (Fiona's actual company-observed list) worth planning a
 * long-haul trip around, with the PTO cost to extend each into a long
 * weekend. Skips any window that overlaps a day Fiona is already known to be
 * busy (including an already-planned trip), since that time is accounted for.
 */
export function upcomingPtoSuggestions(
  snapshot: AvailabilitySnapshot,
  monthsAhead = 12,
): PtoSuggestion[] {
  const today = startOfDay(new Date());
  const horizon = addDays(today, monthsAhead * 31);
  const years = [today.getFullYear(), today.getFullYear() + 1];
  const holidays = years.flatMap((y) => optumHolidays(y));
  const holidaySet = new Set(holidays.map((h) => format(h.date, "yyyy-MM-dd")));

  const blocks = mergeAdjacentHolidays(holidays).filter(
    (b) => b.end >= today && b.start <= horizon,
  );

  return blocks
    .map((block) => {
      const freeStart = extendFreeRun(block.start, -1, holidaySet);
      const freeEnd = extendFreeRun(block.end, 1, holidaySet);
      const before = extendEdge(freeStart, -1, holidaySet);
      const after = extendEdge(freeEnd, 1, holidaySet);

      return {
        holidayName: block.name,
        holidayDate: block.start,
        windowStart: before.edge,
        windowEnd: after.edge,
        ptoDaysNeeded: before.pto + after.pto,
      };
    })
    .filter((s) => {
      let cursor = s.windowStart;
      while (cursor <= s.windowEnd) {
        if (snapshot.busyDates.has(format(cursor, "yyyy-MM-dd"))) return false;
        cursor = addDays(cursor, 1);
      }
      return true;
    });
}
