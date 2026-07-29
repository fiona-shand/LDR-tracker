import { Clock, ExternalLink, Sparkles } from "lucide-react";
import { formatDuration } from "@/lib/flights";
import { FIONA, JAKE } from "@/lib/people";
import type { LegFare, TripOption } from "@/lib/trip-options";

export type { LegFare, TripOption };

/** SerpApi returns times as "2026-08-01 08:15" -- show just the clock part. */
function clockTime(value?: string): string | undefined {
  if (!value) return undefined;
  const match = value.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : undefined;
}

export default function DestinationFareCard({
  option,
  best,
}: {
  option: TripOption;
  best?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-surface p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        best ? "border-accent ring-1 ring-accent" : "border-surface-border"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{option.title}</p>
          <p className="text-sm text-muted">{option.subtitle}</p>
        </div>
        {best && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
            <Sparkles className="h-3 w-3" />
            Best value
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <FareCell label={`${FIONA.name} · ${FIONA.airport.iataCode}`} fare={option.fiona} />
        <FareCell label={`${JAKE.name} · ${JAKE.airport.iataCode}`} fare={option.jake} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-surface-border pt-3 text-sm">
        <span className="text-muted">Combined total</span>
        <span className="font-semibold">
          {option.total == null ? "—" : `$${option.total.toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}

function FareCell({ label, fare }: { label: string; fare: LegFare }) {
  const depart = clockTime(fare.departureTime);
  const arrive = clockTime(fare.arrivalTime);

  return (
    <div className="rounded-xl bg-background px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-semibold">
        {fare.price === 0 ? "Home" : fare.price == null ? "No fare found" : `$${fare.price.toFixed(2)}`}
      </p>

      {fare.price != null && fare.price > 0 && (
        <>
          {fare.durationMinutes != null && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              <Clock className="h-3 w-3" />
              {formatDuration(fare.durationMinutes)} nonstop
            </p>
          )}
          {depart && arrive && (
            <p className="text-xs text-muted">
              {depart} → {arrive}
            </p>
          )}
          {fare.airline && <p className="text-xs text-muted">{fare.airline}</p>}

          {fare.bookUrl && (
            <a
              href={fare.bookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Book flight
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </>
      )}
    </div>
  );
}
