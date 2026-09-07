import { config } from "../config";
import { cached } from "../cache";
import {
  fetchJson,
  POOL_SIZE,
  POOL_TTL_SECONDS,
  SEARCH_TTL_SECONDS,
  type NewsArticle,
  type NewsProvider,
} from "./provider";

interface GNewsResponse {
  totalArticles: number;
  articles: {
    title: string;
    description: string;
    url: string;
    image: string | null;
    publishedAt: string;
    source: { name: string; url: string };
  }[];
}

function buildUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${config.gnews.baseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("apikey", config.gnews.apiKey);
  return url.toString();
}

function toArticles(data: GNewsResponse | null): NewsArticle[] {
  if (!Array.isArray(data?.articles)) return [];
  return data.articles
    .filter((a) => a.title && a.url)
    .map((a) => ({
      title: a.title,
      description: a.description ?? "",
      url: a.url,
      image: a.image,
      publishedAt: a.publishedAt,
      source: a.source,
    }));
}

/**
 * The only source with a country dimension, so it carries the region-specific
 * half of the feed.
 *
 * GNews uses lowercase ISO 3166-1 alpha-2 country codes, while our
 * RegionContext stores uppercase (e.g. "US", "GB", "GR").
 */
export const gnewsProvider: NewsProvider = {
  async pool(country) {
    if (!config.gnews.apiKey) return [];
    const cc = country.toLowerCase();

    return cached(
      `news:gnews:pool:${cc}`,
      async () =>
        toArticles(
          await fetchJson<GNewsResponse>(
            buildUrl("/top-headlines", {
              category: "entertainment",
              q: "movie",
              country: cc,
              max: String(POOL_SIZE),
            }),
          ),
        ),
      POOL_TTL_SECONDS,
    );
  },

  async search(query, country, max) {
    if (!config.gnews.apiKey) return [];
    const cc = country.toLowerCase();

    return cached(
      `news:gnews:search:${query.toLowerCase()}:${cc}`,
      async () =>
        toArticles(
          await fetchJson<GNewsResponse>(
            buildUrl("/search", {
              q: query,
              lang: "en",
              country: cc,
              max: String(max),
            }),
          ),
        ),
      SEARCH_TTL_SECONDS,
    );
  },
};
