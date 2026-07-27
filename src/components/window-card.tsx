import { CalendarDays, Briefcase } from "lucide-react";

export type SampleWindow = {
  id: string;
  label: string;
  dateRange: string;
  nights: number;
  weekendOnly: boolean;
  ptoDays?: number;
};

export default function WindowCard({ window }: { window: SampleWindow }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-muted">{window.label}</p>
          <p className="mt-0.5 font-semibold">{window.dateRange}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <CalendarDays className="h-4 w-4" />
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted">
        <span>
          {window.nights} night{window.nights === 1 ? "" : "s"}
        </span>
        <span aria-hidden>·</span>
        {window.weekendOnly ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            No PTO needed
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <Briefcase className="h-3 w-3" />
            {window.ptoDays} PTO day{window.ptoDays === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </div>
  );
}
