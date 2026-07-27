import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getActiveProfileId, isAuthenticated } from "@/lib/session";
import ProfileSwitcher from "@/components/profile-switcher";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/login");

  let people: { id: string; name: string }[] = [];
  let dbError: string | null = null;
  try {
    people = await prisma.person.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });
  } catch {
    dbError =
      "Could not connect to the database. Set DATABASE_URL in .env, then run `npx prisma migrate dev` and `npx prisma db seed`.";
  }

  const storedProfileId = await getActiveProfileId();
  const activeProfileId =
    storedProfileId && people.some((p) => p.id === storedProfileId)
      ? storedProfileId
      : (people[0]?.id ?? null);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <nav className="flex items-center gap-4">
          <Link href="/" className="font-semibold">
            LDR Tracker
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <ProfileSwitcher people={people} activeProfileId={activeProfileId} />
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-sm text-gray-500 hover:text-foreground">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6">
        {dbError && (
          <p className="mb-6 rounded border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            {dbError}
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
