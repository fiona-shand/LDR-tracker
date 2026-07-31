import { AlertCircle, CheckCircle2, MapPin, Plus, X } from "lucide-react";
import DestinationSearchInput from "@/components/destination-search-input";
import InterestsPicker from "@/components/interests-picker";
import PlannedTripsSection from "@/components/planned-trips-section";
import PtoHolidaysSection from "@/components/pto-holidays-section";
import { addDestination, removeDestination } from "@/lib/actions/destinations";
import { setCadence } from "@/lib/actions/preferences";
import { getFionaPtoBalance } from "@/lib/actions/pto";
import { getAvailabilitySnapshot } from "@/lib/availability";
import { getDestinations } from "@/lib/destinations-data";
import { listPlannedTrips } from "@/lib/planned-trips";
import { getPreferences } from "@/lib/preferences";
import { upcomingPtoSuggestions } from "@/lib/pto-suggestions";
import SubmitButton from "@/components/submit-button";

export const dynamic = "force-dynamic";

const STATUS_MESSAGES: Record<string, { kind: "success" | "error"; text: string }> = {
  "visit-added": { kind: "success", text: "Visit added. The calendar and next recommendation are updated." },
  "visit-removed": { kind: "success", text: "Visit removed." },
  "visit-error": { kind: "error", text: "That visit could not be saved. Please try again." },
  "visit-dates-error": { kind: "error", text: "The visit end date must be on or after its start date." },
  "visit-destination-error": { kind: "error", text: "Enter a three-letter destination airport code, such as LHR." },
  "destination-added": { kind: "success", text: "Destination added." },
  "destination-removed": { kind: "success", text: "Destination removed." },
  "destination-error": { kind: "error", text: "That destination could not be saved." },
  "interests-saved": { kind: "success", text: "Interests saved. Recommendations are updated." },
  "interests-error": { kind: "error", text: "Interests could not be saved." },
  "cadence-saved": { kind: "success", text: "Cadence saved. Recommendations are updated." },
  "cadence-error": { kind: "error", text: "Enter a valid minimum and maximum cadence." },
  "pto-saved": { kind: "success", text: "PTO balance saved." },
  "pto-error": { kind: "error", text: "Enter a valid PTO balance." },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const notice = status ? STATUS_MESSAGES[status] : undefined;
  const [snapshot, trips, destinationResult, preferences, ptoBalance] = await Promise.all([
    getAvailabilitySnapshot(),
    listPlannedTrips(),
    getDestinations(),
    getPreferences(),
    getFionaPtoBalance(),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          The information used to choose your next visit.
        </p>
      </header>

      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${
            notice.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          {notice.kind === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <p>{notice.text}</p>
        </div>
      )}

      <section id="visits" className="scroll-mt-24">
        <h2 className="text-lg font-semibold">Visits</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Log past and future visits. The latest visit resets the cadence clock.
        </p>
        <PlannedTripsSection trips={trips} />
      </section>

      <section>
        <h2 className="text-lg font-semibold">Interests</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          These help break ties between otherwise similar destinations.
        </p>
        <InterestsPicker chosen={preferences.interests} />
      </section>

      <section>
        <h2 className="text-lg font-semibold">Cadence</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          How many weeks you ideally want between visits.
        </p>
        <form action={setCadence} className="flex flex-wrap items-end gap-3 rounded-2xl border border-surface-border bg-surface p-4 shadow-sm">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted">At least</span>
            <input name="cadenceMinWeeks" type="number" min={1} max={52} defaultValue={preferences.cadenceMinWeeks} className="w-20 rounded-lg border border-surface-border bg-transparent px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted">At most</span>
            <input name="cadenceMaxWeeks" type="number" min={1} max={52} defaultValue={preferences.cadenceMaxWeeks} className="w-20 rounded-lg border border-surface-border bg-transparent px-3 py-2" />
          </label>
          <SubmitButton className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background">
            Save cadence
          </SubmitButton>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Destinations</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Places you would realistically consider meeting.
        </p>
        <ul className="mb-4 grid gap-2 sm:grid-cols-2">
          {destinationResult.destinations.map((destination) => (
            <li key={destination.id} className="flex items-center justify-between rounded-xl border border-surface-border bg-surface px-3 py-2">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 shrink-0 text-accent" />
                <span className="truncate">{destination.cityName}</span>
                <span className="text-muted">{destination.iataCode}</span>
              </span>
              <form action={removeDestination}>
                <input type="hidden" name="id" value={destination.id} />
                <button type="submit" aria-label={`Remove ${destination.cityName}`} className="p-1 text-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addDestination} className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface p-4 shadow-sm sm:flex-row sm:items-end">
          <div className="flex-1"><DestinationSearchInput /></div>
          <SubmitButton pendingLabel="Adding…" className="flex items-center justify-center gap-1 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background">
            <Plus className="h-4 w-4" /> Add
          </SubmitButton>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Time off</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Fiona&apos;s remaining PTO and useful holiday windows.
        </p>
        <PtoHolidaysSection
          suggestions={upcomingPtoSuggestions(snapshot).slice(0, 3)}
          ptoBalance={ptoBalance}
        />
      </section>
    </div>
  );
}
