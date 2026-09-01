import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getExternalRatings, type ExternalRatings } from "@/lib/ratings";

type OkBody = { ratings: ExternalRatings | null };

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

  if (!Number.isFinite(id) || id < 1) {
    return res.status(400).json({ error: "Invalid id" });
  }
  if (mediaType !== "movie" && mediaType !== "tv") {
    return res.status(400).json({ error: "mediaType must be movie or tv" });
  }

  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: "Sign in to see external ratings" });
  }

  // Per-user gated, so the response must never land in a shared CDN cache.
  res.setHeader("Cache-Control", "private, no-store");
  const ratings = await getExternalRatings(mediaType, id);
  return res.status(200).json({ ratings });
}
