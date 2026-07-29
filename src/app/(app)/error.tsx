"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-surface-border bg-surface p-8 text-center shadow-sm">
      <TriangleAlert className="h-8 w-8 text-muted" />
      <div>
        <p className="font-semibold">Something went wrong loading this page.</p>
        <p className="mt-1 text-sm text-muted">
          {error.digest ? `Error digest: ${error.digest}` : error.message || "Unknown error"}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.98]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-surface-border px-4 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
        >
          Back to Calendar
        </Link>
      </div>
    </div>
  );
}
