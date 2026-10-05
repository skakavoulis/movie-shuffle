import { cached } from "@/lib/cache";
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
