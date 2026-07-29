type WikipediaSummary = {
  thumbnail?: { source: string };
  originalimage?: { source: string };
};

/**
 * A representative photo for a city via Wikipedia's free REST API -- no key,
 * no account, no rate-limit signup. Best-effort: returns null on any miss
 * (ambiguous name, no article, network hiccup) so callers can fall back to
 * a plain placeholder instead of breaking the page.
 */
export async function getDestinationImage(cityName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cityName)}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5_000),
        next: { revalidate: 60 * 60 * 24 * 7 },
      },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as WikipediaSummary;
    return data.thumbnail?.source ?? data.originalimage?.source ?? null;
  } catch {
    return null;
  }
}
