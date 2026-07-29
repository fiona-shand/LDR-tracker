type WikipediaSearchResponse = {
  query?: {
    pages?: Record<string, { thumbnail?: { source: string } }>;
  };
};

/**
 * A representative photo for a city via Wikipedia's free REST API -- no key,
 * no account, no rate-limit signup. Uses full-text search (not an exact
 * page-title lookup) so ambiguous names like "New York" resolve to the
 * actual city article instead of coming up empty, and asks for an 800px
 * thumbnail so it doesn't look pixelated in a large card. Best-effort:
 * returns null on any miss so callers fall back to a plain placeholder.
 */
export async function getDestinationImage(cityName: string): Promise<string | null> {
  try {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", cityName);
    url.searchParams.set("gsrlimit", "1");
    url.searchParams.set("prop", "pageimages");
    url.searchParams.set("piprop", "thumbnail");
    url.searchParams.set("pithumbsize", "800");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as WikipediaSearchResponse;
    const pages = Object.values(data.query?.pages ?? {});
    return pages[0]?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}
