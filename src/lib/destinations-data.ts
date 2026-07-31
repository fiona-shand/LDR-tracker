import { prisma } from "@/lib/db";

export type DestinationLike = {
  id: string;
  iataCode: string;
  cityName: string;
  /** Interest tags (see interests.ts). Absent on the curated quick-add list. */
  interests?: string[];
};

// Curated quick-add suggestions on the Destinations page -- roughly midpoint
// cities between MSP and LHR. This is a real feature (a starting point to
// add from), not a stand-in for your saved destinations.
export const SUGGESTED_DESTINATIONS: DestinationLike[] = [
  { id: "sample-kef", iataCode: "KEF", cityName: "Reykjavík" },
  { id: "sample-bos", iataCode: "BOS", cityName: "Boston" },
  { id: "sample-lis", iataCode: "LIS", cityName: "Lisbon" },
  { id: "sample-nyc", iataCode: "NYC", cityName: "New York" },
];

export async function getDestinations(): Promise<{
  destinations: DestinationLike[];
  error: boolean;
}> {
  try {
    const destinations = await prisma.destination.findMany({
      orderBy: { createdAt: "asc" },
    });
    return { destinations, error: false };
  } catch {
    return { destinations: [], error: true };
  }
}
