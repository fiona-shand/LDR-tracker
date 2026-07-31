import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import type { AvailabilitySnapshot } from "@/lib/availability";
import { CADENCE_MAX_WEEKS, CADENCE_MIN_WEEKS } from "@/lib/cadence";
import { JAKE, PEOPLE } from "@/lib/people";
import type { PlannedTripRow } from "@/lib/planned-trips";

/**
 * How often you two want to see each other, in weeks.
 * @deprecated Prefer CADENCE_MIN_WEEKS / CADENCE_MAX_WEEKS from `cadence.ts`.
 */
export const TARGET_VISIT_INTERVAL_WEEKS = CADENCE_MIN_WEEKS;

type Person = (typeof PEOPLE)[number];

function primaryCityWord(city: string): string {
  return city.split(/[\s–-]+/)[0]?.toLowerCase() ?? "";
}

/**
 * Best-effort guess that a calendar event means "we're together this day":
 * the title mentions the other person's name, home airport code, or home
 * city. This is a text match on whatever you titled the event -- it won't
 * catch a vaguely-named event, and could rarely false-match unrelated text.
 */
function looksLikeVisit(title: string, otherPerson: Person): boolean {
  const t = title.toLowerCase();
  return (
    t.includes(otherPerson.name.toLowerCase()) ||
    t.includes(otherPerson.airport.iataCode.toLowerCase()) ||
    t.includes(primaryCityWord(otherPerson.airport.city))
  );
}

/**
 * Calendar dates that look like a visit together, deduped and sorted.
 * Combines two signals: a manually-recorded planned trip (reliable,
 * regardless of title) and a text match on a synced calendar event's title
 * (best-effort, for things like an actual flight confirmation).
 */
export function detectVisitDates(snapshot: AvailabilitySnapshot): Date[] {
  const isoDates = new Set<string>(snapshot.togetherDates);

  for (const [iso, titles] of Object.entries(snapshot.busyEvents)) {
    if (titles.some((title) => looksLikeVisit(title, JAKE))) {
      isoDates.add(iso);
    }
  }

  return Array.from(isoDates)
    .map((iso) => {
      const [year, month, day] = iso.split("-").map(Number);
      return new Date(year, month - 1, day);
    })
    .sort((a, b) => a.getTime() - b.getTime());
}

export type LastSeenInfo = {
  lastSeenDate: Date | null;
  weeksSinceLastSeen: number | null;
  nextPlannedDate: Date | null;
  targetWeeks: number;
  isOverdue: boolean;
};

/**
 * Every day covered by a recorded trip, expanded from its start/end.
 * The availability snapshot only reaches back to today, so a trip that has
 * already finished is invisible to it -- these rows are the only way to know
 * when you last actually saw each other.
 */
function datesFromTripRows(trips: PlannedTripRow[]): Date[] {
  const dates: Date[] = [];
  for (const trip of trips) {
    let cursor = startOfDay(trip.startsAt);
    const end = startOfDay(trip.endsAt);
    while (cursor <= end) {
      dates.push(cursor);
      cursor = addDays(cursor, 1);
    }
  }
  return dates;
}

export function getLastSeenInfo(
  snapshot: AvailabilitySnapshot,
  plannedTrips: PlannedTripRow[] = [],
): LastSeenInfo {
  const today = startOfDay(new Date());
  const dates = [...detectVisitDates(snapshot), ...datesFromTripRows(plannedTrips)].sort(
    (a, b) => a.getTime() - b.getTime(),
  );

  const past = dates.filter((d) => d <= today);
  const future = dates.filter((d) => d > today);

  const lastSeenDate = past.length > 0 ? past[past.length - 1] : null;
  const nextPlannedDate = future.length > 0 ? future[0] : null;
  const weeksSinceLastSeen = lastSeenDate
    ? Math.floor(differenceInCalendarDays(today, lastSeenDate) / 7)
    : null;

  return {
    lastSeenDate,
    weeksSinceLastSeen,
    nextPlannedDate,
    targetWeeks: CADENCE_MIN_WEEKS,
    isOverdue: weeksSinceLastSeen != null && weeksSinceLastSeen > CADENCE_MAX_WEEKS,
  };
}
