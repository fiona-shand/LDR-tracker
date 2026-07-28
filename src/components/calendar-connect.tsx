import { CheckCircle2, UploadCloud } from "lucide-react";
import { uploadIcsCalendar } from "@/lib/actions/calendar-upload";
import { PEOPLE } from "@/lib/people";
import type { AvailabilitySnapshot } from "@/lib/availability";

export default function CalendarConnect({ snapshot }: { snapshot: AvailabilitySnapshot }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PEOPLE.map((person) => {
        const connected = snapshot.sources[person.id] === "real";
        return (
          <div
            key={person.id}
            className="rounded-2xl border border-surface-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">{person.name}&apos;s calendar</p>
              {connected ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Connected
                </span>
              ) : (
                <span className="text-xs text-muted">Sample data</span>
              )}
            </div>
            <form action={uploadIcsCalendar} className="mt-3 flex items-center gap-2">
              <input type="hidden" name="personId" value={person.id} />
              <input
                type="file"
                name="file"
                accept=".ics"
                required
                className="flex-1 truncate text-xs text-muted file:mr-2 file:rounded-full file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-accent file:transition-colors hover:file:bg-accent/20"
              />
              <button
                type="submit"
                aria-label={`Upload ${person.name}'s .ics file`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95"
              >
                <UploadCloud className="h-4 w-4" />
              </button>
            </form>
          </div>
        );
      })}
    </div>
  );
}
