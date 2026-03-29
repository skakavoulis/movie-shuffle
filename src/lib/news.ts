import { config } from "./config";
import { cached } from "./cache";

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string; url: string };
}

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

/**
 * GNews uses lowercase ISO 3166-1 alpha-2 country codes.
 * Our RegionContext stores uppercase (e.g. "US", "GB", "GR").
 */
const POOL_SIZE = 10;

async function fetchNewsPool(country: string): Promise<NewsArticle[]> {
  const cc = country.toLowerCase();

  return cached(`news:movie:${cc}`, async () => {
    const url = new URL(`${config.gnews.baseUrl}/top-headlines`);
    url.searchParams.set("category", "entertainment");
    url.searchParams.set("q", "movie");
    url.searchParams.set("country", cc);
    url.searchParams.set("max", String(POOL_SIZE));
    url.searchParams.set("apikey", config.gnews.apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) return [];

    const data: GNewsResponse = await res.json();
    return data.articles.map((a) => ({
      title: a.title,
      description: a.description,
      url: a.url,
      image: a.image,
      publishedAt: a.publishedAt,
      source: a.source,
    }));
  });
}

function sampleArticles(articles: NewsArticle[], count: number): NewsArticle[] {
  const pool = [...articles];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export async function getMovieNews(
  country = "us",
  pick = 6,
): Promise<NewsArticle[]> {
  if (!config.gnews.apiKey) return [];

  try {
    const pool = await fetchNewsPool(country);
    return sampleArticles(pool, pick);
  } catch {
    return [];
  }
}

export async function searchMovieNews(
  query: string,
  country = "us",
  max = 6,
): Promise<NewsArticle[]> {
  if (!config.gnews.apiKey || !query.trim()) return [];

  const cc = country.toLowerCase();
  const q = query.trim().toLowerCase();
  const cacheKey = `news:search:${q}:${cc}`;

  try {
    return await cached(cacheKey, async () => {
      const url = new URL(`${config.gnews.baseUrl}/search`);
      url.searchParams.set("q", query);
      url.searchParams.set("lang", "en");
      url.searchParams.set("country", cc);
      url.searchParams.set("max", String(max));
      url.searchParams.set("apikey", config.gnews.apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) return [];

      const data: GNewsResponse = await res.json();
      return data.articles.map((a) => ({
        title: a.title,
        description: a.description,
        url: a.url,
        image: a.image,
        publishedAt: a.publishedAt,
        source: a.source,
      }));
    });
  } catch {
    return [];
  }
}
