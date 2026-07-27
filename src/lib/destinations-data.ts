import { prisma } from "@/lib/db";

export type DestinationLike = {
  id: string;
  iataCode: string;
  cityName: string;
};

// Roughly-midpoint cities between MSP and LHR, shown as suggestions and as a
// fallback when the database isn't connected yet.
export const SAMPLE_DESTINATIONS: DestinationLike[] = [
  { id: "sample-kef", iataCode: "KEF", cityName: "Reykjavík" },
  { id: "sample-bos", iataCode: "BOS", cityName: "Boston" },
  { id: "sample-lis", iataCode: "LIS", cityName: "Lisbon" },
  { id: "sample-nyc", iataCode: "NYC", cityName: "New York" },
];

export async function getDestinationsOrSample(): Promise<{
  destinations: DestinationLike[];
  isSample: boolean;
}> {
  try {
    const destinations = await prisma.destination.findMany({
      orderBy: { createdAt: "asc" },
    });
    return { destinations, isSample: false };
  } catch {
    return { destinations: SAMPLE_DESTINATIONS, isSample: true };
  }
}
