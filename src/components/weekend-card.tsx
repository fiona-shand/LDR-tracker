import Link from "next/link";
import { format } from "date-fns";
import { CalendarCheck2, X } from "lucide-react";
import type { WeekendAvailability } from "@/lib/availability";

export default function WeekendCard({ weekend }: { weekend: WeekendAvailability }) {
  const saturdayIso = format(weekend.saturday, "yyyy-MM-dd");
  const dateLabel = `${format(weekend.friday, "EEE, MMM d")} – ${format(weekend.sunday, "EEE, MMM d")}`;

  if (weekend.available) {
    return (
      <Link
        href={`/search?weekend=${saturdayIso}`}
        className="group flex items-center justify-between rounded-2xl border border-surface-border bg-surface p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-day-free text-day-free-ink">
            <CalendarCheck2 className="h-4 w-4" />
          </span>
          <div>
            <p className="font-medium">{dateLabel}</p>
            <p className="text-sm text-muted">Fiona is free — plan a trip</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-sm font-medium text-accent">
          Search flights
          <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
        </span>
      </Link>
    );
  }

  const parts: string[] = [];
  if (weekend.busyDetails.length > 0) {
    parts.push(
      `${weekend.busyDetails
        .map((d) => (d.titles.length > 0 ? `${d.name} (${d.titles.join(", ")})` : d.name))
        .join(" & ")} busy`,
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface p-4 opacity-60">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-border/50 text-muted">
        <X className="h-4 w-4" />
      </span>
      <div>
        <p className="font-medium">{dateLabel}</p>
        <p className="text-sm text-muted">{parts.join(" · ")}</p>
      </div>
    </div>
  );
}
