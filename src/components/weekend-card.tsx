import Link from "next/link";
import { format } from "date-fns";
import { CalendarCheck2, X } from "lucide-react";
import type { WeekendAvailability } from "@/lib/mock-availability";

export default function WeekendCard({ weekend }: { weekend: WeekendAvailability }) {
  const saturdayIso = format(weekend.saturday, "yyyy-MM-dd");
  const dateLabel = `${format(weekend.saturday, "EEE, MMM d")} – ${format(weekend.sunday, "EEE, MMM d")}`;

  if (weekend.bothFree) {
    return (
      <Link
        href={`/search?weekend=${saturdayIso}`}
        className="flex items-center justify-between rounded-2xl border border-surface-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-white">
            <CalendarCheck2 className="h-4 w-4" />
          </span>
          <div>
            <p className="font-medium">{dateLabel}</p>
            <p className="text-sm text-muted">Both free — plan a trip</p>
          </div>
        </div>
        <span className="text-sm font-medium text-accent">Search flights →</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface p-4 opacity-60">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-border/50 text-muted">
        <X className="h-4 w-4" />
      </span>
      <div>
        <p className="font-medium">{dateLabel}</p>
        <p className="text-sm text-muted">{weekend.busyNames.join(" & ")} busy</p>
      </div>
    </div>
  );
}
