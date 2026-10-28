import { cached } from "@/lib/cache";
import { config } from "@/lib/config";
import type { TMDBVideo } from "@/lib/tmdb";

export interface YouTubeSearchResult {
  id: string;
  title: string;
}

/**
 * Searches YouTube for videos by scraping the search results page
 * and extracting video data from the embedded ytInitialData JSON.
 */
export async function searchYouTubeVideos(
  query: string,
  maxResults = 10,
): Promise<YouTubeSearchResult[]> {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const match = html.match(/var ytInitialData\s*=\s*({[\s\S]+?});<\/script>/);
    if (!match) return [];

    const data = JSON.parse(match[1]);
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;

    if (!Array.isArray(contents)) return [];

    const videos: YouTubeSearchResult[] = [];
    for (const item of contents) {
      const renderer = item?.videoRenderer;
      if (!renderer?.videoId) continue;
      videos.push({
        id: renderer.videoId,
        title:
          renderer.title?.runs?.[0]?.text ?? renderer.title?.simpleText ?? "",
      });
      if (videos.length >= maxResults) break;
    }

    return videos;
  } catch {
    return [];
  }
}

class NoVideosError extends Error {}

/**
 * Cached YouTube search, shaped for the videos carousel. An empty result
 * usually means the scrape failed rather than that nothing matched, so it is
 * returned but kept out of the cache to be retried on the next request.
 */
export async function getYouTubeVideos(
  cacheKey: string,
  query: string,
): Promise<TMDBVideo[]> {
  try {
    return await cached(cacheKey, async () => {
      const results = await searchYouTubeVideos(query);
      if (results.length === 0) throw new NoVideosError();
      return results.map((v) => ({
        id: v.id,
        key: v.id,
        name: v.title,
        site: "YouTube",
        type: "Video",
      }));
    });
  } catch (e) {
    if (e instanceof NoVideosError) return [];
    throw e;
  }
}

export interface YouTubeComment {
  id: string;
  author: string;
  authorAvatar: string | null;
  text: string;
  likeCount: number;
  publishedAt: string;
}

interface CommentThreadsResponse {
  items?: {
    snippet: {
      topLevelComment: {
        id: string;
        snippet: {
          authorDisplayName: string;
          authorProfileImageUrl?: string;
          textOriginal: string;
          likeCount: number;
          publishedAt: string;
        };
      };
    };
  }[];
}

/**
 * YouTube's "top comments" to rank by likes; 100 is the API's page maximum and
 * costs the same single quota unit as fewer.
 */
const COMMENT_POOL_SIZE = 100;
export const TOP_COMMENTS_COUNT = 20;
const COMMENT_TTL_SECONDS = 24 * 60 * 60;

export function isYouTubeApiConfigured(): boolean {
  return Boolean(config.youtube.apiKey);
}

/**
 * A video's most-liked comments, most-liked first, via the YouTube Data API
 * (1 quota unit). `order=relevance` is YouTube's "Top comments" ranking, which
 * mixes in recency and replies, so the pool is re-ranked by likes. Empty when
 * comments are off; quota and network errors throw, so they aren't cached.
 */
export async function getTopYouTubeComments(
  videoId: string,
): Promise<YouTubeComment[]> {
  return cached(
    `youtube:top_comments:${videoId}`,
    async () => {
      const url = new URL(`${config.youtube.baseUrl}/commentThreads`);
      url.searchParams.set("part", "snippet");
      url.searchParams.set("videoId", videoId);
      url.searchParams.set("order", "relevance");
      url.searchParams.set("maxResults", String(COMMENT_POOL_SIZE));
      url.searchParams.set("textFormat", "plainText");
      url.searchParams.set("key", config.youtube.apiKey);

      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      // 403 commentsDisabled and 404 videoNotFound are answers, not failures.
      if (res.status === 404) return [];
      if (res.status === 403) {
        const body = await res.json().catch(() => null);
        const reason = body?.error?.errors?.[0]?.reason;
        if (reason === "commentsDisabled") return [];
      }
      if (!res.ok) {
        throw new Error(`YouTube API error: ${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as CommentThreadsResponse;
      return (data.items ?? [])
        .map(({ snippet: { topLevelComment: c } }) => ({
          id: c.id,
          author: c.snippet.authorDisplayName,
          authorAvatar: c.snippet.authorProfileImageUrl ?? null,
          text: c.snippet.textOriginal,
          likeCount: c.snippet.likeCount,
          publishedAt: c.snippet.publishedAt,
        }))
        .sort((a, b) => b.likeCount - a.likeCount)
        .slice(0, TOP_COMMENTS_COUNT);
    },
    COMMENT_TTL_SECONDS,
  );
}
