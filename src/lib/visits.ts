import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { AvailabilitySnapshot } from "@/lib/availability";
import { PEOPLE } from "@/lib/people";

/** How often you two want to see each other, in weeks. */
export const TARGET_VISIT_INTERVAL_WEEKS = 5;

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

/** Calendar dates (either person's calendar) that look like a visit together, deduped and sorted. */
export function detectVisitDates(snapshot: AvailabilitySnapshot): Date[] {
  const isoDates = new Set<string>();

  for (const person of PEOPLE) {
    const other = PEOPLE.find((p) => p.id !== person.id)!;
    const events = snapshot.busyEvents[person.id];
    for (const [iso, titles] of Object.entries(events)) {
      if (titles.some((title) => looksLikeVisit(title, other))) {
        isoDates.add(iso);
      }
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

export function getLastSeenInfo(snapshot: AvailabilitySnapshot): LastSeenInfo {
  const today = startOfDay(new Date());
  const dates = detectVisitDates(snapshot);

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
    targetWeeks: TARGET_VISIT_INTERVAL_WEEKS,
    isOverdue: weeksSinceLastSeen != null && weeksSinceLastSeen > TARGET_VISIT_INTERVAL_WEEKS,
  };
}
