import Link from "next/link";
import { format } from "date-fns";
import GroupedBarChart from "@/components/grouped-bar-chart";
import {
  getAvailabilitySnapshot,
  getUpcomingWeekends,
  getWeekendBySaturdayIso,
} from "@/lib/availability";
import { formatDuration, isFlightSearchConfigured } from "@/lib/flights";
import { FIONA, JAKE } from "@/lib/people";
import { estimateGroundCost } from "@/lib/trip-cost";
import { buildTripOptions, type LegFare } from "@/lib/trip-options";

export const dynamic = "force-dynamic";

function legLabel(leg: LegFare): string {
  if (leg.price === 0) return "Home";
  if (leg.price == null) return "No fare";
  const duration = leg.durationMinutes != null ? ` · ${formatDuration(leg.durationMinutes)}` : "";
  return `$${leg.price.toFixed(0)}${duration}`;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ weekend?: string }>;
}) {
  const { weekend: weekendParam } = await searchParams;

  const snapshot = await getAvailabilitySnapshot();
  const upcomingFreeWeekends = getUpcomingWeekends(snapshot, 10).filter((w) => w.bothFree);
  const weekend =
    (weekendParam ? getWeekendBySaturdayIso(snapshot, weekendParam) : null) ??
    upcomingFreeWeekends[0] ??
    null;

  const { options, anyRealFares } = await buildTripOptions(weekend);

  const rows = options.map((o) => {
    const fionaHours = (o.fiona.durationMinutes ?? 0) / 60;
    const jakeHours = (o.jake.durationMinutes ?? 0) / 60;
    const groundCost = estimateGroundCost(o.isHomeStay);
    const grandTotal = o.total == null ? null : o.total + groundCost;
    return { ...o, fionaHours, jakeHours, groundCost, grandTotal };
  });

  const chartRows = rows.filter((r) => r.fiona.price != null || r.jake.price != null);
  const categories = chartRows.map((r) => r.title.replace(/^Visit |^Meet in /, ""));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Compare trips</h1>
        <p className="mt-1 text-sm text-muted">
          Flight time and cost side by side across every destination, plus a rough
          hotel &amp; food estimate.
        </p>
      </div>

      {weekend ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-surface-border bg-surface p-4 shadow-sm">
          <span className="text-sm text-muted">Weekend of</span>
          <span className="font-semibold">
            {format(weekend.friday, "EEE, MMM d")} – {format(weekend.sunday, "EEE, MMM d")}
          </span>
          {upcomingFreeWeekends.length > 1 && (
            <div className="ml-auto flex flex-wrap gap-2">
              {upcomingFreeWeekends.slice(0, 5).map((w) => {
                const iso = format(w.saturday, "yyyy-MM-dd");
                const active = format(weekend.saturday, "yyyy-MM-dd") === iso;
                return (
                  <Link
                    key={iso}
                    href={`/compare?weekend=${iso}`}
                    className={`rounded-full border px-3 py-1 text-xs transition-all active:scale-95 ${
                      active
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-surface-border text-muted hover:border-accent hover:text-accent"
                    }`}
                  >
                    {format(w.saturday, "MMM d")}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-2xl border border-surface-border bg-surface p-4 text-sm text-muted">
          No fully-free weekend in the next 10 weeks — check the{" "}
          <Link href="/" className="text-accent underline">
            calendar
          </Link>{" "}
          for details.
        </p>
      )}

      {!anyRealFares && (
        <p className="rounded-2xl border border-surface-border bg-surface p-3 text-xs text-muted">
          {isFlightSearchConfigured()
            ? "No live nonstop fares found for this weekend, so there's nothing to chart yet."
            : "No live fares — set SERPAPI_API_KEY to populate cost and flight-time comparisons."}
        </p>
      )}

      {chartRows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <GroupedBarChart
            title="Flight time per person"
            categories={categories}
            series={[
              { name: FIONA.name, color: "var(--series-fiona)", values: chartRows.map((r) => r.fionaHours) },
              { name: JAKE.name, color: "var(--series-jake)", values: chartRows.map((r) => r.jakeHours) },
            ]}
            valueFormatter={(v) => `${v.toFixed(1)}h`}
          />
          <GroupedBarChart
            title="Flight cost per person"
            categories={categories}
            series={[
              { name: FIONA.name, color: "var(--series-fiona)", values: chartRows.map((r) => r.fiona.price ?? 0) },
              { name: JAKE.name, color: "var(--series-jake)", values: chartRows.map((r) => r.jake.price ?? 0) },
            ]}
            valueFormatter={(v) => `$${v.toFixed(0)}`}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-surface-border bg-surface shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-surface-border text-xs text-muted">
              <th className="px-4 py-3 font-medium">Destination</th>
              <th className="px-4 py-3 font-medium">{FIONA.name}</th>
              <th className="px-4 py-3 font-medium">{JAKE.name}</th>
              <th className="px-4 py-3 font-medium">Combined flight time</th>
              <th className="px-4 py-3 font-medium">Flights total</th>
              <th className="px-4 py-3 font-medium">Est. hotel &amp; food</th>
              <th className="px-4 py-3 font-medium">Est. grand total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-surface-border/60 last:border-0">
                <td className="px-4 py-3 font-medium">{r.title}</td>
                <td className="px-4 py-3">{legLabel(r.fiona)}</td>
                <td className="px-4 py-3">{legLabel(r.jake)}</td>
                <td className="px-4 py-3">
                  {r.fionaHours + r.jakeHours > 0 ? formatDuration((r.fionaHours + r.jakeHours) * 60) : "—"}
                </td>
                <td className="px-4 py-3">{r.total == null ? "—" : `$${r.total.toFixed(2)}`}</td>
                <td className="px-4 py-3 text-muted">${r.groundCost.toFixed(0)}</td>
                <td className="px-4 py-3 font-semibold">
                  {r.grandTotal == null ? "—" : `$${r.grandTotal.toFixed(2)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        Flight prices and times are live nonstop quotes. Hotel &amp; food are rough
        flat estimates (one shared room where you&apos;d need one, meals for both of
        you for the trip) — not a real booking, just a ballpark for comparing
        destinations.
      </p>
    </div>
  );
}
