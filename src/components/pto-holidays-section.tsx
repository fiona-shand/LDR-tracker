import { format } from "date-fns";
import { CalendarRange, TriangleAlert } from "lucide-react";
import { setFionaPtoBalance } from "@/lib/actions/pto";
import { FIONA, JAKE } from "@/lib/people";
import type { PtoSuggestion } from "@/lib/pto-suggestions";

function withBudgetFlags(suggestions: PtoSuggestion[], ptoBalance: number | null) {
  let cumulativePto = 0;
  return suggestions.map((s) => {
    const overBudget = ptoBalance != null && cumulativePto + s.ptoDaysNeeded > ptoBalance;
    if (!overBudget) cumulativePto += s.ptoDaysNeeded;
    return { ...s, overBudget };
  });
}

export default function PtoHolidaysSection({
  suggestions,
  ptoBalance,
}: {
  suggestions: PtoSuggestion[];
  ptoBalance: number | null;
}) {
  const flagged = withBudgetFlags(suggestions, ptoBalance);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Long weekends & holidays</h2>
        <form action={setFionaPtoBalance} className="flex items-center gap-2 text-sm">
          <label htmlFor="pto-days" className="text-muted">
            {FIONA.name}&apos;s PTO remaining
          </label>
          <input
            id="pto-days"
            type="number"
            name="days"
            min={0}
            step={0.5}
            defaultValue={ptoBalance ?? ""}
            placeholder="—"
            className="w-16 rounded-lg border border-surface-border bg-transparent px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <button
            type="submit"
            className="rounded-lg border border-surface-border px-2 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
          >
            Save
          </button>
        </form>
      </div>

      {suggestions.length === 0 ? (
        <p className="rounded-2xl border border-surface-border bg-surface p-4 text-sm text-muted">
          No open US holiday windows in the next year — they&apos;re either past or already
          covered by a planned trip.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {flagged.map((s) => {
            const { overBudget } = s;

            return (
              <div
                key={s.holidayName + s.holidayDate.toISOString()}
                className="flex items-start gap-3 rounded-2xl border border-surface-border bg-surface p-4 shadow-sm"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <CalendarRange className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-medium">{s.holidayName}</p>
                  <p className="text-sm text-muted">
                    {format(s.windowStart, "EEE, MMM d")} – {format(s.windowEnd, "EEE, MMM d")}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {s.ptoDaysNeeded === 0
                      ? "Already a long weekend, no PTO needed"
                      : `${s.ptoDaysNeeded} PTO day${s.ptoDaysNeeded > 1 ? "s" : ""} for ${FIONA.name} · ${JAKE.name} has unlimited PTO`}
                  </p>
                  {overBudget && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      <TriangleAlert className="h-3 w-3" />
                      Over PTO budget for the year at this point
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
