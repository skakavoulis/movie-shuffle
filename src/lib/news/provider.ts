export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string; url: string };
}

/**
 * Each source normalises its own payload into `NewsArticle[]` and swallows its
 * own failures, so one provider going down can neither empty the news section
 * nor poison another provider's cache.
 */
export interface NewsProvider {
  pool(country: string): Promise<NewsArticle[]>;
  search(query: string, country: string, max: number): Promise<NewsArticle[]>;
}

export const POOL_SIZE = 10;

/**
 * Headlines go stale fast, but the Guardian developer tier allows only 500
 * calls/day, so the pool is cached per hour rather than the 1-week default.
 */
export const POOL_TTL_SECONDS = 60 * 60;
export const SEARCH_TTL_SECONDS = 24 * 60 * 60;

const REQUEST_TIMEOUT_MS = 6000;

export async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
