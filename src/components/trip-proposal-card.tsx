import { format } from "date-fns";
import { CalendarDays, Check, Clock, ExternalLink, MapPin, Sparkles } from "lucide-react";
import { formatDuration } from "@/lib/flights";
import { FIONA, JAKE } from "@/lib/people";
import type { TripProposal } from "@/lib/trip-planner";
import type { LegFare } from "@/lib/trip-options";

/** SerpApi returns times as "2026-08-01 08:15" -- show just the clock part. */
function clockTime(value?: string): string | undefined {
  if (!value) return undefined;
  const match = value.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : undefined;
}

function dateRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  return sameMonth
    ? `${format(start, "EEE d")} – ${format(end, "EEE d MMM")}`
    : `${format(start, "EEE d MMM")} – ${format(end, "EEE d MMM")}`;
}

export default function TripProposalCard({
  proposal,
  best,
  imageUrl,
}: {
  proposal: TripProposal;
  best?: boolean;
  imageUrl?: string | null;
}) {
  const { window, destination, costTier, fares } = proposal;
  const fionaIsHome = destination.iataCode === FIONA.airport.iataCode;
  const jakeIsHome = destination.iataCode === JAKE.airport.iataCode;

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-surface shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        best ? "border-accent ring-1 ring-accent" : "border-surface-border"
      }`}
    >
      <div className="relative aspect-[16/9] w-full bg-accent-soft">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={destination.cityName}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <MapPin className="h-8 w-8 text-accent/50" />
          </div>
        )}
        {/* Cost tier describes local hotel/restaurant prices, which don't apply
            when you're staying at each other's places -- showing London as
            $$$$ next to Minneapolis as $$ would contradict the estimate below. */}
        {costTier && !destination.isHomeStay && (
          <span className="absolute bottom-2 left-2 rounded-full bg-foreground/80 px-2 py-0.5 text-xs font-semibold text-background backdrop-blur-sm">
            {"$".repeat(costTier)}
            <span className="text-background/50">{"$".repeat(4 - costTier)}</span>
          </span>
        )}
        {best && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
            <Sparkles className="h-3 w-3" />
            Top pick
          </span>
        )}
      </div>

      <div className="p-5">
        <p className="font-semibold">{proposal.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
          <CalendarDays className="h-3.5 w-3.5" />
          {dateRange(window.start, window.end)}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Stat label={`${window.days} days together`} />
          <Stat
            label={window.ptoDays === 0 ? "No PTO needed" : `${window.ptoDays} PTO days`}
            emphasis={window.ptoDays === 0}
          />
        </div>

        {proposal.reasons.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1.5">
            {proposal.reasons.slice(0, 3).map((reason) => (
              <li key={reason} className="flex items-start gap-1.5 text-xs text-muted">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                {reason}
              </li>
            ))}
          </ul>
        )}

        {fares && (
          <div
            className={`mt-4 grid gap-3 ${fionaIsHome || jakeIsHome ? "grid-cols-1" : "grid-cols-2"}`}
          >
            {!fionaIsHome && (
              <FareCell label={`${FIONA.name} · ${FIONA.airport.iataCode}`} fare={fares.fiona} />
            )}
            {!jakeIsHome && (
              <FareCell label={`${JAKE.name} · ${JAKE.airport.iataCode}`} fare={fares.jake} />
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-surface-border pt-3 text-sm">
          <span className="text-muted">
            {proposal.estimatedTotal == null ? "Flights + stay" : "Est. total"}
          </span>
          <span className="font-semibold">
            {proposal.estimatedTotal == null
              ? "—"
              : `$${proposal.estimatedTotal.toFixed(0)}`}
          </span>
        </div>
        <p className="mt-1 text-right text-xs text-muted">
          {fares?.total != null
            ? `$${fares.total.toFixed(0)} flights + ~$${proposal.groundCost.toFixed(0)} stay`
            : `~$${proposal.groundCost.toFixed(0)} est. hotel & food`}
        </p>
      </div>
    </div>
  );
}

function Stat({ label, emphasis }: { label: string; emphasis?: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        emphasis ? "bg-accent-soft text-accent" : "bg-background text-muted"
      }`}
    >
      {label}
    </span>
  );
}

function FareCell({ label, fare }: { label: string; fare: LegFare }) {
  const depart = clockTime(fare.departureTime);
  const arrive = clockTime(fare.arrivalTime);

  return (
    <div className="rounded-xl bg-background px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-base font-semibold">
        {fare.price === 0
          ? "Home"
          : fare.price == null
            ? "No fare found"
            : `$${fare.price.toFixed(0)}`}
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
          {fare.bookUrl && (
            <a
              href={fare.bookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Book
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </>
      )}
    </div>
  );
}
