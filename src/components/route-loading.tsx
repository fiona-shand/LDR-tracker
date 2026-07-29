import { Loader2 } from "lucide-react";

/**
 * Shown instantly on nav-link click while a force-dynamic route's server
 * work (DB queries, live flight/calendar/image fetches) is still in
 * flight -- without this, App Router holds the old page on screen with no
 * feedback, so the nav bar looks unresponsive for however long that fetch
 * takes.
 */
export default function RouteLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted">
      <Loader2 className="h-5 w-5 animate-spin" />
      <p className="text-sm">Loading…</p>
    </div>
  );
}
