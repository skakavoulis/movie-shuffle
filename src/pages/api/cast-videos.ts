import type { NextApiRequest, NextApiResponse } from "next";
import { getPersonDetails, type TMDBVideo } from "@/lib/tmdb";
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

  const id = Number(req.query.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    // The query is built from the person rather than taken from the request,
    // so this can't be used as a general YouTube search proxy.
    const person = await getPersonDetails(id);
    const videos = await getYouTubeVideos(
      `person:${id}:youtube_videos`,
      `${person.name} ${person.known_for_department}`,
    );
    // An empty list is likely a failed scrape; let the CDN retry it sooner.
    res.setHeader("Cache-Control", videos.length > 0 ? CDN_LONG : CDN_MEDIUM);
    return res.status(200).json({ videos });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load videos";
    return res.status(500).json({ error: msg });
  }
}
