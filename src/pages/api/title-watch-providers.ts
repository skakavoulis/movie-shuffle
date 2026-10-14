import type { NextApiRequest, NextApiResponse } from "next";
import {
  getMovieWatchProvidersById,
  getTVShowWatchProvidersById,
  pickWatchRegion,
} from "@/lib/tmdb";
import { getStreamingOptions } from "@/lib/streamingAvailability";
import {
  buildWatchOffer,
  OFFER_TYPES,
  supportsDirectLink,
  type WatchOffer,
} from "@/lib/providerUrls";
import { CDN_MEDIUM } from "@/lib/cdnCache";

type OkBody = { offer: WatchOffer | null };

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
  const title = String(req.query.title ?? "").slice(0, 200);

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
    const offer = pickWatchRegion(watchData.results, region)?.offer;
    if (!offer?.link) {
      res.setHeader("Cache-Control", CDN_MEDIUM);
      return res.status(200).json({ offer: null });
    }

    // Only spend Streaming Availability quota when a deep link is possible.
    const wantsDirect = OFFER_TYPES.some((type) =>
      (offer[type] ?? []).some(supportsDirectLink),
    );
    const options = wantsDirect
      ? await getStreamingOptions(mediaType, id, region)
      : null;

    res.setHeader("Cache-Control", CDN_MEDIUM);
    return res.status(200).json({
      offer: buildWatchOffer(offer, options ?? [], { title, region }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load providers";
    return res.status(500).json({ error: msg });
  }
}
