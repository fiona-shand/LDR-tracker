import { MapPin, X } from "lucide-react";
import { prisma } from "@/lib/db";
import { addDestination, removeDestination } from "@/lib/actions/destinations";

export const dynamic = "force-dynamic";

export default async function DestinationsSettingsPage() {
  let destinations: Awaited<ReturnType<typeof prisma.destination.findMany>>;
  try {
    destinations = await prisma.destination.findMany({
      orderBy: { createdAt: "asc" },
    });
  } catch {
    return (
      <div className="rounded-2xl border border-surface-border bg-surface p-5 text-sm text-muted">
        Could not connect to the database. Set DATABASE_URL in .env and run
        the migration + seed commands, then reload.
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold tracking-tight">Destinations</h1>
      <p className="mt-1 text-sm text-muted">
        Shared list of cities you&apos;re both tracking as possible meetup spots.
      </p>

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
          </li>
        ))}
        {destinations.length === 0 && (
          <li className="rounded-2xl border border-dashed border-surface-border px-4 py-6 text-center text-sm text-muted">
            No destinations added yet.
          </li>
        )}
      </ul>

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
