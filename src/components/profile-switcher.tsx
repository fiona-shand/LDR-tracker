type Person = { id: string; name: string };

export default function ProfileSwitcher({
  people,
  activeProfileId,
}: {
  people: Person[];
  activeProfileId: string | null;
}) {
  if (people.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">Viewing as</span>
      {people.map((person) => (
        <form action="/api/profile/switch" method="POST" key={person.id}>
          <input type="hidden" name="personId" value={person.id} />
          <button
            type="submit"
            className={
              person.id === activeProfileId
                ? "font-semibold underline"
                : "text-gray-500 hover:text-foreground"
            }
          >
            {person.name}
          </button>
        </form>
      ))}
    </div>
  );
}
