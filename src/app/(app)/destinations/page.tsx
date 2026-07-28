import { MapPin, Plus, X } from "lucide-react";
import { addDestination, removeDestination } from "@/lib/actions/destinations";
import { getDestinationsOrSample, SAMPLE_DESTINATIONS } from "@/lib/destinations-data";
import DestinationSearchInput from "@/components/destination-search-input";

export const dynamic = "force-dynamic";

export default async function DestinationsPage() {
  const { destinations, isSample } = await getDestinationsOrSample();
  const suggestions = SAMPLE_DESTINATIONS.filter(
    (s) => !destinations.some((d) => d.iataCode === s.iataCode),
  );

  return (
    <div>
      <div className="max-w-md">
        <h1 className="text-xl font-semibold tracking-tight">Destinations</h1>
        <p className="mt-1 text-sm text-muted">
          Cities you&apos;re both interested in — visiting each other, or
          meeting somewhere in between.
        </p>

        {isSample && (
          <p className="mt-4 rounded-2xl border border-surface-border bg-surface p-3 text-xs text-muted">
            Showing sample destinations — connect a database to save your own
            (set DATABASE_URL in .env, then run the migration + seed commands).
          </p>
        )}
      </div>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {destinations.map((destination) => (
          <li
            key={destination.id}
            className="flex items-center justify-between rounded-2xl border border-surface-border bg-surface px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="flex min-w-0 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-accent" />
              <span className="truncate">{destination.cityName}</span>
              <span className="shrink-0 text-muted">({destination.iataCode})</span>
            </span>
            {!isSample && (
              <form action={removeDestination}>
                <input type="hidden" name="id" value={destination.id} />
                <button
                  type="submit"
                  aria-label="Remove destination"
                  className="shrink-0 rounded-full p-1 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
            )}
          </li>
        ))}
        {destinations.length === 0 && (
          <li className="rounded-2xl border border-dashed border-surface-border px-4 py-6 text-center text-sm text-muted sm:col-span-2 lg:col-span-3 xl:col-span-4">
            No destinations added yet.
          </li>
        )}
      </ul>

      {suggestions.length > 0 && (
        <div className="mt-6 max-w-md">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Suggested — roughly in between
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <form action={addDestination} key={s.iataCode}>
                <input type="hidden" name="cityName" value={s.cityName} />
                <input type="hidden" name="iataCode" value={s.iataCode} />
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-full border border-surface-border px-3 py-1.5 text-sm transition-colors hover:border-accent hover:text-accent active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {s.cityName}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      <form
        action={addDestination}
        key={destinations.length}
        className="mt-6 flex max-w-md flex-col gap-3 rounded-2xl border border-surface-border bg-surface p-5 shadow-sm"
      >
        <DestinationSearchInput />
        <button
          type="submit"
          className="rounded-lg bg-gradient-to-r from-accent to-accent-2 px-3 py-2 font-medium text-white transition-all hover:opacity-90 active:scale-[0.98]"
        >
          Add destination
        </button>
      </form>
    </div>
  );
}
