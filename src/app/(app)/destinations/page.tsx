import { MapPin, Plus, X } from "lucide-react";
import { addDestination, removeDestination } from "@/lib/actions/destinations";
import { getDestinationsOrSample, SAMPLE_DESTINATIONS } from "@/lib/destinations-data";

export const dynamic = "force-dynamic";

export default async function DestinationsPage() {
  const { destinations, isSample } = await getDestinationsOrSample();
  const suggestions = SAMPLE_DESTINATIONS.filter(
    (s) => !destinations.some((d) => d.iataCode === s.iataCode),
  );

  return (
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

      <ul className="mt-6 flex flex-col gap-2">
        {destinations.map((destination) => (
          <li
            key={destination.id}
            className="flex items-center justify-between rounded-2xl border border-surface-border bg-surface px-4 py-3 shadow-sm"
          >
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" />
              {destination.cityName}
              <span className="text-muted">({destination.iataCode})</span>
            </span>
            {!isSample && (
              <form action={removeDestination}>
                <input type="hidden" name="id" value={destination.id} />
                <button
                  type="submit"
                  aria-label="Remove destination"
                  className="rounded-full p-1 text-muted hover:bg-accent-soft hover:text-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
            )}
          </li>
        ))}
        {destinations.length === 0 && (
          <li className="rounded-2xl border border-dashed border-surface-border px-4 py-6 text-center text-sm text-muted">
            No destinations added yet.
          </li>
        )}
      </ul>

      {suggestions.length > 0 && (
        <div className="mt-6">
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
                  className="flex items-center gap-1 rounded-full border border-surface-border px-3 py-1.5 text-sm hover:border-accent hover:text-accent"
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
        className="mt-6 flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface p-5 shadow-sm"
      >
        <input
          type="text"
          name="cityName"
          placeholder="City (e.g. Lisbon)"
          required
          className="rounded-lg border border-surface-border bg-background px-3 py-2 outline-none focus:border-accent"
        />
        <input
          type="text"
          name="iataCode"
          placeholder="IATA code (e.g. LIS)"
          maxLength={3}
          required
          className="rounded-lg border border-surface-border bg-background px-3 py-2 uppercase outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-lg bg-gradient-to-r from-accent to-accent-2 px-3 py-2 font-medium text-white transition-opacity hover:opacity-90"
        >
          Add destination
        </button>
      </form>
    </div>
  );
}
