import { format } from "date-fns";
import { CalendarHeart, CircleCheck, TriangleAlert } from "lucide-react";
import type { LastSeenInfo } from "@/lib/visits";

export default function LastSeenBanner({ info }: { info: LastSeenInfo }) {
  if (!info.lastSeenDate) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-surface-border bg-surface p-4 text-sm text-muted">
        <CalendarHeart className="h-5 w-5 shrink-0" />
        <p>
          No visits detected yet from your calendars — you&apos;re aiming to see each
          other roughly every {info.targetWeeks} weeks.
        </p>
      </div>
    );
  }

  const weeks = info.weeksSinceLastSeen ?? 0;
  const weeksLabel = weeks === 0 ? "this week" : `${weeks} week${weeks === 1 ? "" : "s"} ago`;

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 text-sm shadow-sm ${
        info.isOverdue
          ? "border-amber-300/60 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-200"
          : "border-surface-border bg-surface text-foreground"
      }`}
    >
      {info.isOverdue ? (
        <TriangleAlert className="h-5 w-5 shrink-0" />
      ) : (
        <CircleCheck className="h-5 w-5 shrink-0 text-accent" />
      )}
      <p className="flex-1">
        Last saw each other <span className="font-semibold">{weeksLabel}</span> —{" "}
        {format(info.lastSeenDate, "MMM d")}. Target is every {info.targetWeeks} weeks.
        {info.isOverdue && " Time to plan a visit."}
      </p>
      {info.nextPlannedDate && (
        <span className="text-xs text-muted">
          Next visit planned: {format(info.nextPlannedDate, "MMM d")}
        </span>
      )}
    </div>
  );
}
