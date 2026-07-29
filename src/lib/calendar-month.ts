import { startOfMonth } from "date-fns";

export function parseMonthParam(value: string | undefined): Date {
  if (value) {
    const [year, month] = value.split("-").map(Number);
    if (year && month) return new Date(year, month - 1, 1);
  }
  return startOfMonth(new Date());
}

export function formatMonthParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
