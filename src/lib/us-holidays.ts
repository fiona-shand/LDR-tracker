import { addDays, lastDayOfMonth } from "date-fns";

export type Holiday = { name: string; date: Date };

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const last = lastDayOfMonth(new Date(year, month, 1));
  const offset = (last.getDay() - weekday + 7) % 7;
  return addDays(last, -offset);
}

/** US federal holidays for a given year, computed from the standard rules (not a hardcoded date list). */
export function usFederalHolidays(year: number): Holiday[] {
  return [
    { name: "New Year's Day", date: new Date(year, 0, 1) },
    { name: "Martin Luther King Jr. Day", date: nthWeekdayOfMonth(year, 0, 1, 3) },
    { name: "Presidents Day", date: nthWeekdayOfMonth(year, 1, 1, 3) },
    { name: "Memorial Day", date: lastWeekdayOfMonth(year, 4, 1) },
    { name: "Juneteenth", date: new Date(year, 5, 19) },
    { name: "Independence Day", date: new Date(year, 6, 4) },
    { name: "Labor Day", date: nthWeekdayOfMonth(year, 8, 1, 1) },
    { name: "Columbus Day", date: nthWeekdayOfMonth(year, 9, 1, 2) },
    { name: "Veterans Day", date: new Date(year, 10, 11) },
    { name: "Thanksgiving", date: nthWeekdayOfMonth(year, 10, 4, 4) },
    { name: "Christmas Day", date: new Date(year, 11, 25) },
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
}
