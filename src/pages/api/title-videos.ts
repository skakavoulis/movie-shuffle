import type { NextApiRequest, NextApiResponse } from "next";
import {
  getMovieDetails,
  getTVShowDetails,
  orderTitleVideos,
  type TMDBVideo,
} from "@/lib/tmdb";
import { getYouTubeVideos } from "@/lib/youtube";
import { CDN_LONG, CDN_MEDIUM } from "@/lib/cdnCache";

type OkBody = { videos: TMDBVideo[] };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OkBody | { error: string }>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const mediaType = req.query.mediaType as string;
  const id = Number(req.query.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid id" });
  }
  if (mediaType !== "movie" && mediaType !== "tv") {
    return res.status(400).json({ error: "mediaType must be movie or tv" });
  }

  try {
    // Same cached payload the detail page renders from, so this adds no
    // TMDB calls of its own.
    let tmdbVideos: TMDBVideo[] | undefined;
    let query: string;
    if (mediaType === "tv") {
      const show = await getTVShowDetails(id);
      tmdbVideos = show.videos?.results;
      query = `${show.name} tv series`;
    } else {
      const movie = await getMovieDetails(id);
      tmdbVideos = movie.videos?.results;
      const year = movie.release_date?.split("-")[0] ?? "";
      query = `${movie.title} ${year} movie`;
    }
    const youtubeVideos = await getYouTubeVideos(
      `${mediaType}:${id}:youtube_videos`,
      query,
    );

    // TMDB's curated videos (trailer first) lead; YouTube results fill in
    // after them, skipping any TMDB already lists.
    const ordered = orderTitleVideos(tmdbVideos);
    const seen = new Set(ordered.map((v) => v.key));
    const videos = [
      ...ordered,
      ...youtubeVideos.filter((v) => !seen.has(v.key)),
    ];

    // An empty YouTube result is likely a failed scrape; let the CDN retry it
    // sooner.
    res.setHeader(
      "Cache-Control",
      youtubeVideos.length > 0 ? CDN_LONG : CDN_MEDIUM,
    );
    return res.status(200).json({ videos });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load videos";
    return res.status(500).json({ error: msg });
  }
}
