import type { NextApiRequest, NextApiResponse } from "next";
import {
  getMovieGenres,
  getMovieWatchProviders,
  getTVGenres,
  getTVWatchProviders,
  type TMDBGenre,
  type TMDBWatchProvider,
} from "@/lib/tmdb";
import { CDN_MEDIUM } from "@/lib/cdnCache";

type Body = {
  genres: TMDBGenre[];
  providers: TMDBWatchProvider[];
  tvGenres: TMDBGenre[];
  tvProviders: TMDBWatchProvider[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Body | { error: string }>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const region = String(req.query.region || "US").slice(0, 8);

  try {
    const [movieGenreData, movieProviderData, tvGenreData, tvProviderData] =
      await Promise.all([
        getMovieGenres(),
        getMovieWatchProviders(region),
        getTVGenres(),
        getTVWatchProviders(region),
      ]);

    const providers = movieProviderData.results
      .sort((a, b) => a.display_priority - b.display_priority)
      .slice(0, 30);
    const tvProviders = tvProviderData.results
      .sort((a, b) => a.display_priority - b.display_priority)
      .slice(0, 30);

    res.setHeader("Cache-Control", CDN_MEDIUM);
    return res.status(200).json({
      genres: movieGenreData.genres,
      providers,
      tvGenres: tvGenreData.genres,
      tvProviders,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load discover meta";
    return res.status(500).json({ error: msg });
  }
}
