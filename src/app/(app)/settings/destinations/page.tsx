import { prisma } from "@/lib/db";
import { addDestination, removeDestination } from "@/lib/actions/destinations";

export default async function DestinationsSettingsPage() {
  let destinations: Awaited<ReturnType<typeof prisma.destination.findMany>>;
  try {
    destinations = await prisma.destination.findMany({
      orderBy: { createdAt: "asc" },
    });
  } catch {
    return (
      <p className="text-sm text-gray-500">
        Could not connect to the database. Set DATABASE_URL in .env and run
        the migration + seed commands, then reload.
      </p>
    );
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold">Destinations</h1>
      <p className="mt-1 text-sm text-gray-500">
        Shared list of cities you&apos;re both tracking as possible meetup spots.
      </p>

      <ul className="mt-6 flex flex-col gap-2">
        {destinations.map((destination) => (
          <li
            key={destination.id}
            className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 dark:border-gray-800"
          >
            <span>
              {destination.cityName} ({destination.iataCode})
            </span>
            <form action={removeDestination}>
              <input type="hidden" name="id" value={destination.id} />
              <button type="submit" className="text-sm text-gray-500 hover:text-red-600">
                Remove
              </button>
            </form>
          </li>
        ))}
        {destinations.length === 0 && (
          <li className="text-sm text-gray-500">No destinations added yet.</li>
        )}
      </ul>

      <form action={addDestination} className="mt-6 flex flex-col gap-3">
        <input
          type="text"
          name="cityName"
          placeholder="City (e.g. Lisbon)"
          required
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-transparent"
        />
        <input
          type="text"
          name="iataCode"
          placeholder="IATA code (e.g. LIS)"
          maxLength={3}
          required
          className="rounded border border-gray-300 px-3 py-2 uppercase dark:border-gray-700 dark:bg-transparent"
        />
        <button type="submit" className="rounded bg-foreground px-3 py-2 text-background">
          Add destination
        </button>
      </form>
    </div>
  );
}
