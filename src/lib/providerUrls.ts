/**
 * Maps TMDB watch provider IDs to direct search URLs on each streaming service.
 * Uses search URLs (no external API) so users land on the provider's search for the title.
 * Provider IDs from TMDB watch/providers endpoint (data sourced from JustWatch).
 */

const PROVIDER_SEARCH_URLS: Record<number, (query: string) => string> = {
  // Streaming (flatrate)
  8: (q) => `https://www.netflix.com/search?q=${encodeURIComponent(q)}`,
  9: (q) =>
    `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(q)}`,
  337: (q) => `https://www.disneyplus.com/search?q=${encodeURIComponent(q)}`,
  15: (q) => `https://www.hulu.com/search?q=${encodeURIComponent(q)}`,
  1899: (q) => `https://www.max.com/search?q=${encodeURIComponent(q)}`,
  386: (q) => `https://www.peacocktv.com/search?q=${encodeURIComponent(q)}`,
  350: (q) => `https://tv.apple.com/us/search?term=${encodeURIComponent(q)}`,
  531: (q) =>
    `https://www.paramountplus.com/search/?q=${encodeURIComponent(q)}`,
  283: (q) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(q)}`,
  43: (q) => `https://www.starz.com/search?q=${encodeURIComponent(q)}`,
  37: (q) => `https://www.sho.com/search?q=${encodeURIComponent(q)}`,
  257: (q) => `https://www.fubo.tv/welcome/search?q=${encodeURIComponent(q)}`,
  505: (q) =>
    `https://www.paramountplus.com/search/?q=${encodeURIComponent(q)}`,
  2: (q) => `https://tv.apple.com/us/search?term=${encodeURIComponent(q)}`,
  // Rent/Buy
  3: (q) =>
    `https://play.google.com/store/search?q=${encodeURIComponent(q)}&c=movies`,
  192: (q) =>
    `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  10: (q) =>
    `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(q)}`,
  167: (q) =>
    `https://www.vudu.com/content/search?searchString=${encodeURIComponent(q)}`,
  228: (q) =>
    `https://www.microsoft.com/en-us/store/search?q=${encodeURIComponent(q)}`,
  384: (q) => `https://www.hulu.com/search?q=${encodeURIComponent(q)}`,
  7: (q) =>
    `https://www.vudu.com/content/search?searchString=${encodeURIComponent(q)}`,
};

/**
 * Build a direct search URL for a provider, or return null if we don't have a mapping.
 */
export function getProviderSearchUrl(
  providerId: number,
  title: string,
): string | null {
  const builder = PROVIDER_SEARCH_URLS[providerId];
  if (!builder) return null;
  return builder(title);
}
