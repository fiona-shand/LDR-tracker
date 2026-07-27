export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form
        action="/api/auth/login"
        method="POST"
        className="flex w-full max-w-xs flex-col gap-4"
      >
        <h1 className="text-lg font-semibold">LDR Tracker</h1>
        <input
          type="password"
          name="passcode"
          placeholder="Passcode"
          required
          autoFocus
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-transparent"
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Incorrect passcode.
          </p>
        )}
        <button
          type="submit"
          className="rounded bg-foreground px-3 py-2 text-background"
        >
          Enter
        </button>
      </form>
    </main>
  );
}
