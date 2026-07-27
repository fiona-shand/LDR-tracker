import { Sparkles } from "lucide-react";
import { FIONA, JAKE } from "@/lib/people";

export type TripOption = {
  key: string;
  title: string;
  subtitle: string;
  iataCode: string;
  fareFiona: number;
  fareJake: number;
  total: number;
};

export default function DestinationFareCard({
  option,
  best,
}: {
  option: TripOption;
  best?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-surface p-5 shadow-sm ${
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
        <FareCell label={`${FIONA.name} · ${FIONA.airport.iataCode}`} price={option.fareFiona} />
        <FareCell label={`${JAKE.name} · ${JAKE.airport.iataCode}`} price={option.fareJake} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-surface-border pt-3 text-sm">
        <span className="text-muted">Combined total</span>
        <span className="font-semibold">${option.total}</span>
      </div>
    </div>
  );
}

function FareCell({ label, price }: { label: string; price: number }) {
  return (
    <div className="rounded-xl bg-background px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-semibold">
        {price === 0 ? "Home" : `$${price}`}
      </p>
    </div>
  );
}
