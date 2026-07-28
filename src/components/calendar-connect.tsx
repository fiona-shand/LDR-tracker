import { CheckCircle2, Link2, RefreshCw, UploadCloud } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { uploadIcsCalendar } from "@/lib/actions/calendar-upload";
import { connectCalendarUrl, resyncCalendarConnection } from "@/lib/actions/calendar-url-connect";
import { prisma } from "@/lib/db";
import { PEOPLE } from "@/lib/people";
import type { AvailabilitySnapshot } from "@/lib/availability";

export default async function CalendarConnect({ snapshot }: { snapshot: AvailabilitySnapshot }) {
  const connections = await prisma.calendarConnection.findMany({
    where: { personId: { in: PEOPLE.map((p) => p.id) }, provider: "ICS" },
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PEOPLE.map((person) => {
        const connected = snapshot.sources[person.id] === "real";
        const connection = connections.find((c) => c.personId === person.id);
        const linkSynced = !!connection?.icsUrl;

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

            {linkSynced ? (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-accent-soft/50 px-3 py-2 text-xs text-muted">
                <span>
                  {connection!.label}
                  {connection!.lastSyncStatus === "error"
                    ? " — last sync failed"
                    : connection!.lastSyncedAt
                      ? ` — synced ${formatDistanceToNow(connection!.lastSyncedAt, { addSuffix: true })}`
                      : null}
                </span>
                <form action={resyncCalendarConnection}>
                  <input type="hidden" name="connectionId" value={connection!.id} />
                  <button
                    type="submit"
                    aria-label={`Sync ${person.name}'s calendar now`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-accent transition-transform hover:scale-105 active:scale-95"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            ) : (
              <form action={connectCalendarUrl} className="mt-3 flex items-center gap-2">
                <input type="hidden" name="personId" value={person.id} />
                <input
                  type="url"
                  name="url"
                  placeholder="Paste your webcal:// or .ics link"
                  required
                  className="flex-1 truncate rounded-full border border-surface-border bg-transparent px-3 py-1.5 text-xs placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                <button
                  type="submit"
                  aria-label={`Connect ${person.name}'s calendar link`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95"
                >
                  <Link2 className="h-4 w-4" />
                </button>
              </form>
            )}

            <form action={uploadIcsCalendar} className="mt-2 flex items-center gap-2">
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
