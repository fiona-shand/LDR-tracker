import { MapPin, Sparkles } from "lucide-react";
import { PEOPLE } from "@/lib/people";

export type SampleFares = {
  destinationCity: string;
  destinationCode: string;
  fareFromYou: number;
  fareFromPartner: number;
  currency?: string;
};

export default function FlightTeaser({ fares }: { fares: SampleFares }) {
  const [you, partner] = PEOPLE;
  const currency = fares.currency ?? "$";
  const total = fares.fareFromYou + fares.fareFromPartner;

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-accent" />
          <p className="font-semibold">
            {fares.destinationCity} ({fares.destinationCode})
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
          <Sparkles className="h-3 w-3" />
          Preview
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <FareCell label={`${you.name} · ${you.airport.iataCode}`} price={fares.fareFromYou} currency={currency} />
        <FareCell
          label={`${partner.name} · ${partner.airport.iataCode}`}
          price={fares.fareFromPartner}
          currency={currency}
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-surface-border pt-3 text-sm">
        <span className="text-muted">Combined total</span>
        <span className="font-semibold">
          {currency}
          {total}
        </span>
      </div>
    </div>
  );
}

function FareCell({ label, price, currency }: { label: string; price: number; currency: string }) {
  return (
    <div className="rounded-xl bg-background px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-semibold">
        {currency}
        {price}
      </p>
    </div>
  );
}
