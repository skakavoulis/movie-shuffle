import type { NextApiRequest, NextApiResponse } from "next";
import {
  getMovieWatchProvidersById,
  getTVShowWatchProvidersById,
  pickWatchRegion,
  type TMDBWatchProviderOffer,
} from "@/lib/tmdb";
import { CDN_MEDIUM } from "@/lib/cdnCache";

type OkBody = { offer: TMDBWatchProviderOffer | null };

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
  const region = String(req.query.region || "US").slice(0, 8);

  if (!Number.isFinite(id) || id < 1) {
    return res.status(400).json({ error: "Invalid id" });
  }
  if (mediaType !== "movie" && mediaType !== "tv") {
    return res.status(400).json({ error: "mediaType must be movie or tv" });
  }

  try {
    const watchData =
      mediaType === "tv"
        ? await getTVShowWatchProvidersById(id)
        : await getMovieWatchProvidersById(id);
    const picked = pickWatchRegion(watchData.results, region);
    res.setHeader("Cache-Control", CDN_MEDIUM);
    return res.status(200).json({ offer: picked?.offer ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load providers";
    return res.status(500).json({ error: msg });
  }
}
