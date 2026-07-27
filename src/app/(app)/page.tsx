import RouteHero from "@/components/route-hero";
import WindowCard, { type SampleWindow } from "@/components/window-card";
import FlightTeaser, { type SampleFares } from "@/components/flight-teaser";

const SAMPLE_WINDOWS: SampleWindow[] = [
  {
    id: "1",
    label: "Long weekend",
    dateRange: "Fri, Sep 12 – Mon, Sep 15",
    nights: 3,
    weekendOnly: true,
  },
  {
    id: "2",
    label: "Extended trip",
    dateRange: "Thu, Oct 23 – Wed, Oct 29",
    nights: 6,
    weekendOnly: false,
    ptoDays: 3,
  },
  {
    id: "3",
    label: "Quick reunion",
    dateRange: "Fri, Nov 21 – Sun, Nov 23",
    nights: 2,
    weekendOnly: true,
  },
];

const SAMPLE_FARES: SampleFares = {
  destinationCity: "Lisbon",
  destinationCode: "LIS",
  fareFromYou: 214,
  fareFromPartner: 389,
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-10">
      <RouteHero />

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight">
            Availability windows
          </h1>
          <span className="text-sm text-muted">Next 6 months</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {SAMPLE_WINDOWS.map((window) => (
            <WindowCard key={window.id} window={window} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            Flight preview
          </h2>
          <span className="text-sm text-muted">for your next window</span>
        </div>
        <div className="max-w-sm">
          <FlightTeaser fares={SAMPLE_FARES} />
        </div>
      </section>
    </div>
  );
}
