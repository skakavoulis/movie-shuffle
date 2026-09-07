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

interface GuardianResponse {
  response: {
    status: string;
    results: {
      type: string;
      webPublicationDate: string;
      webTitle: string;
      webUrl: string;
      fields?: { trailText?: string; thumbnail?: string };
    }[];
  };
}

const SOURCE: NewsArticle["source"] = {
  name: "The Guardian",
  url: "https://www.theguardian.com",
};

/**
 * Restricting to the `film` section is a better relevance filter than GNews'
 * `entertainment` category plus a "movie" keyword.
 */
function buildUrl(params: Record<string, string>): string {
  const url = new URL(`${config.guardian.baseUrl}/search`);
  url.searchParams.set("section", "film");
  url.searchParams.set("show-fields", "trailText,thumbnail");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("api-key", config.guardian.apiKey);
  return url.toString();
}

/** Thumbnails are served at a width suffix; 500px looks soft on retina cards. */
function upscaleThumbnail(thumbnail: string | undefined): string | null {
  if (!thumbnail) return null;
  return thumbnail.replace(/\/\d+\.jpg$/, "/1000.jpg");
}

/** `trailText` is an HTML fragment, but the cards render it as plain text. */
function stripHtml(html: string | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * `q` is Lucene-flavoured, so characters that are syntax there make the API
 * return 400 rather than ignoring them. Colons and brackets are common in film
 * titles ("Dune: Part Three", "Birds of Prey (and the ...)"), so drop them.
 * Verified safe and therefore kept: & / * ? ! . , - ' — apostrophes especially,
 * since dropping one strands an "s" and sinks titles like "Ocean's Eleven".
 */
function sanitizeQuery(query: string): string {
  return query
    .replace(/["()[\]{}:^~\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toArticles(data: GuardianResponse | null): NewsArticle[] {
  const results = data?.response?.results;
  if (!Array.isArray(results)) return [];
  return results
    .filter((r) => r.webTitle && r.webUrl)
    .map((r) => ({
      title: stripHtml(r.webTitle),
      description: stripHtml(r.fields?.trailText),
      url: r.webUrl,
      image: upscaleThumbnail(r.fields?.thumbnail),
      publishedAt: r.webPublicationDate,
      source: SOURCE,
    }));
}

/**
 * The Guardian has no country dimension, so it supplements the region-specific
 * GNews feed rather than replacing it — `country` is deliberately ignored, and
 * the pool shares one cache entry globally.
 */
export const guardianProvider: NewsProvider = {
  async pool() {
    if (!config.guardian.apiKey) return [];

    return cached(
      "news:guardian:pool",
      async () =>
        toArticles(
          await fetchJson<GuardianResponse>(
            buildUrl({
              "order-by": "newest",
              "page-size": String(POOL_SIZE),
            }),
          ),
        ),
      POOL_TTL_SECONDS,
    );
  },

  async search(query, _country, max) {
    if (!config.guardian.apiKey) return [];

    const q = sanitizeQuery(query);
    if (!q) return [];

    return cached(
      `news:guardian:search:${q.toLowerCase()}`,
      async () =>
        toArticles(
          await fetchJson<GuardianResponse>(
            buildUrl({
              // Quoted so multi-word titles match as a phrase, not as OR'd terms.
              q: `"${q}"`,
              "order-by": "relevance",
              "page-size": String(max),
            }),
          ),
        ),
      SEARCH_TTL_SECONDS,
    );
  },
};
