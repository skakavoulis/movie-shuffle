import type { NextApiRequest, NextApiResponse } from "next";
import { getTVSeasonDetails, type TMDBEpisode } from "@/lib/tmdb";
import { CDN_LONG } from "@/lib/cdnCache";

type OkBody = { episodes: TMDBEpisode[] };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OkBody | { error: string }>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = Number(req.query.id);
  const season = Number(req.query.season);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid id" });
  }
  // Season 0 holds specials.
  if (!Number.isInteger(season) || season < 0) {
    return res.status(400).json({ error: "Invalid season" });
  }

  try {
    const data = await getTVSeasonDetails(id, season);
    const episodes = (data.episodes ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      overview: e.overview,
      season_number: e.season_number,
      episode_number: e.episode_number,
      air_date: e.air_date,
      runtime: e.runtime,
      still_path: e.still_path,
      vote_average: e.vote_average,
    }));
    res.setHeader("Cache-Control", CDN_LONG);
    return res.status(200).json({ episodes });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load season";
    return res.status(500).json({ error: msg });
  }
}
