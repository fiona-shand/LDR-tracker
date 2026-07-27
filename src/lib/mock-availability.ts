import { addDays, format, startOfDay } from "date-fns";
import { PEOPLE } from "@/lib/people";

type PersonId = (typeof PEOPLE)[number]["id"];

// Busy ranges expressed as [offsetDaysStart, offsetDaysEnd] from today, inclusive.
// Fallback data shown until a person's real calendar has been uploaded (see
// src/lib/actions/calendar-upload.ts and src/lib/availability.ts).
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

export function getMockBusyDates(personId: PersonId): Set<string> {
  const today = startOfDay(new Date());
  const dates = new Set<string>();
  for (const [start, end] of BUSY_OFFSETS[personId]) {
    for (let offset = start; offset <= end; offset++) {
      dates.add(format(addDays(today, offset), "yyyy-MM-dd"));
    }
  }
  return dates;
}
