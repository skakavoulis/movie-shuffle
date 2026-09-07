import { gnewsProvider } from "./gnews";
import { guardianProvider } from "./guardian";
import type { NewsArticle, NewsProvider } from "./provider";

export type { NewsArticle } from "./provider";

const PROVIDERS: NewsProvider[] = [gnewsProvider, guardianProvider];

/** Round-robin so a single provider can't fill the whole result set. */
function interleave(groups: NewsArticle[][]): NewsArticle[] {
  const merged: NewsArticle[] = [];
  const longest = Math.max(0, ...groups.map((g) => g.length));
  for (let i = 0; i < longest; i++) {
    for (const group of groups) {
      if (i < group.length) merged.push(group[i]);
    }
  }
  return merged;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Wire stories reach both providers, so match on title as well as URL. */
function dedupe(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  const unique: NewsArticle[] = [];

  for (const article of articles) {
    const keys = [article.url, normalizeTitle(article.title)];
    if (keys.some((key) => seen.has(key))) continue;
    for (const key of keys) seen.add(key);
    unique.push(article);
  }

  return unique;
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
  const groups = await Promise.all(PROVIDERS.map((p) => p.pool(country)));
  return sampleArticles(dedupe(interleave(groups)), pick);
}

export async function searchMovieNews(
  query: string,
  country = "us",
  max = 6,
): Promise<NewsArticle[]> {
  const q = query.trim();
  if (!q) return [];

  const groups = await Promise.all(
    PROVIDERS.map((p) => p.search(q, country, max)),
  );
  return dedupe(interleave(groups)).slice(0, max);
}
