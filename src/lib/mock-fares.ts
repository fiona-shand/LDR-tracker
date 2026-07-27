// Deterministic placeholder fares, standing in for a real flight search
// provider (tracked in issue #6). Same route always returns the same price
// within a session so the UI feels stable rather than random on reload.
export function mockFare(originIataCode: string, destinationIataCode: string): number {
  if (originIataCode === destinationIataCode) return 0;

  const seed = `${originIataCode}-${destinationIataCode}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const min = 79;
  const max = 640;
  return min + (hash % (max - min));
}
