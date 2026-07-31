import { format } from "date-fns";
import { Plus, X } from "lucide-react";
import { addPlannedTrip, removePlannedTrip } from "@/lib/actions/planned-trips";
import type { PlannedTripRow } from "@/lib/planned-trips";

export default function PlannedTripsSection({ trips }: { trips: PlannedTripRow[] }) {
  return (
    <>
      {trips.length > 0 && (
        <ul className="mb-4 grid gap-2 sm:grid-cols-2">
          {trips.map((trip) => (
            <li
              key={trip.externalEventId}
              className="flex items-center justify-between gap-2 rounded-2xl border border-surface-border bg-surface px-4 py-3 shadow-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{trip.title}</p>
                <p className="text-xs text-muted">
                  {format(trip.startsAt, "MMM d, yyyy")} – {format(trip.endsAt, "MMM d, yyyy")}
                </p>
              </div>
              <form action={removePlannedTrip}>
                <input type="hidden" name="externalEventId" value={trip.externalEventId} />
                <button
                  type="submit"
                  aria-label={`Remove ${trip.title}`}
                  className="shrink-0 rounded-full p-1 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form
        action={addPlannedTrip}
        key={trips.length}
        className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface p-4 shadow-sm sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="trip-title" className="mb-1 block text-xs text-muted">
            What & where
          </label>
          <input
            id="trip-title"
            type="text"
            name="title"
            placeholder="e.g. Visiting Jake in Edinburgh"
            required
            className="w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <div>
          <label htmlFor="trip-destination" className="mb-1 block text-xs text-muted">
            Airport
          </label>
          <input
            id="trip-destination"
            type="text"
            name="destinationIataCode"
            placeholder="LHR"
            maxLength={3}
            pattern="[A-Za-z]{3}"
            title="Three-letter airport code, e.g. LHR"
            className="w-20 rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <div>
          <label htmlFor="trip-start" className="mb-1 block text-xs text-muted">
            From
          </label>
          <input
            id="trip-start"
            type="date"
            name="startsAt"
            required
            className="rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <div>
          <label htmlFor="trip-end" className="mb-1 block text-xs text-muted">
            To
          </label>
          <input
            id="trip-end"
            type="date"
            name="endsAt"
            required
            className="rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <button
          type="submit"
          className="flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-3 py-2 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add trip
        </button>
      </form>
    </>
  );
}
