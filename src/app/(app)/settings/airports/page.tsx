import { prisma } from "@/lib/db";
import { getCurrentPerson } from "@/lib/current-person";
import { addAirport, removeAirport } from "@/lib/actions/airports";

export default async function AirportsSettingsPage() {
  let person: Awaited<ReturnType<typeof getCurrentPerson>>;
  try {
    person = await getCurrentPerson();
  } catch {
    return (
      <p className="text-sm text-gray-500">
        Could not connect to the database. Set DATABASE_URL in .env and run
        the migration + seed commands, then reload.
      </p>
    );
  }

  if (!person) {
    return (
      <p className="text-sm text-gray-500">
        No profile found. Seed the database first.
      </p>
    );
  }

  const airports = await prisma.airport.findMany({
    where: { personId: person.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold">Airports</h1>
      <p className="mt-1 text-sm text-gray-500">
        Departure airports for {person.name}.
      </p>

      <ul className="mt-6 flex flex-col gap-2">
        {airports.map((airport) => (
          <li
            key={airport.id}
            className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 dark:border-gray-800"
          >
            <span>
              {airport.iataCode}
              {airport.label ? ` — ${airport.label}` : ""}
            </span>
            <form action={removeAirport}>
              <input type="hidden" name="id" value={airport.id} />
              <button type="submit" className="text-sm text-gray-500 hover:text-red-600">
                Remove
              </button>
            </form>
          </li>
        ))}
        {airports.length === 0 && (
          <li className="text-sm text-gray-500">No airports added yet.</li>
        )}
      </ul>

      <form action={addAirport} className="mt-6 flex flex-col gap-3">
        <input type="hidden" name="personId" value={person.id} />
        <input
          type="text"
          name="iataCode"
          placeholder="IATA code (e.g. SFO)"
          maxLength={3}
          required
          className="rounded border border-gray-300 px-3 py-2 uppercase dark:border-gray-700 dark:bg-transparent"
        />
        <input
          type="text"
          name="label"
          placeholder="Label (optional)"
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-transparent"
        />
        <button type="submit" className="rounded bg-foreground px-3 py-2 text-background">
          Add airport
        </button>
      </form>
    </div>
  );
}
