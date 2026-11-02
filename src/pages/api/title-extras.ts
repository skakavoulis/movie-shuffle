import type { NextApiRequest, NextApiResponse } from "next";
import { getTVShowDetails, type Franchise } from "@/lib/tmdb";
import { getTitleFacts, type TitleFacts } from "@/lib/wikidata";
import { getTVFranchise } from "@/lib/franchise";
import { getTVDoubleFeature, type DoubleFeature } from "@/lib/doubleFeature";
import { requireHuman } from "@/lib/humanCheck";
import { CDN_LONG, CDN_MEDIUM } from "@/lib/cdnCache";

/**
 * The parts of a title page that come from Wikidata (and the per-title
 * caches), loaded by the browser after the human check instead of in
 * getServerSideProps, so a scraper requesting the page never triggers them.
 */
export interface TitleExtras {
  /** Null when Wikidata has no item for the title or didn't answer in time. */
  facts: TitleFacts | null;
  /** TV only: related series and movies, when Wikidata links at least one. */
  franchise: Franchise | null;
  /** TV only: picked here because it must skip the franchise's parts. */
  doubleFeature: DoubleFeature | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TitleExtras | { error: string }>,
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
  if (!requireHuman(req, res)) return;

  try {
    if (mediaType === "movie") {
      const wikidata = await getTitleFacts("movie", id);
      // Missing facts may be a slow first Wikidata fetch still filling the
      // cache; let the CDN ask again sooner.
      res.setHeader("Cache-Control", wikidata ? CDN_LONG : CDN_MEDIUM);
      return res.status(200).json({
        facts: wikidata?.facts ?? null,
        franchise: null,
        doubleFeature: null,
      });
    }

    const [show, wikidata, related] = await Promise.all([
      getTVShowDetails(id),
      getTitleFacts("tv", id),
      getTVFranchise(id),
    ]);
    const franchise = related?.franchise ?? null;
    const doubleFeature = await getTVDoubleFeature(
      show,
      franchise?.parts.filter((p) => p.mediaType === "tv").map((p) => p.id) ??
        [],
    ).catch(() => null);

    res.setHeader(
      "Cache-Control",
      wikidata && related ? CDN_LONG : CDN_MEDIUM,
    );
    return res
      .status(200)
      .json({ facts: wikidata?.facts ?? null, franchise, doubleFeature });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load title extras";
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(500).json({ error: msg });
  }
}
