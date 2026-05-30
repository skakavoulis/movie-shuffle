import type { NextApiRequest, NextApiResponse } from "next";
import {
  discoverMovies,
  discoverTVShows,
  type TMDBMovie,
  type TMDBTVShow,
} from "@/lib/tmdb";
import { CDN_MEDIUM } from "@/lib/cdnCache";

function slimDiscoverResults(
  results: (TMDBMovie | TMDBTVShow)[],
  isTV: boolean,
) {
  return results.map((m) => {
    if (isTV) {
      const s = m as TMDBTVShow;
      return {
        id: s.id,
        name: s.name,
        overview: s.overview,
        poster_path: s.poster_path,
        first_air_date: s.first_air_date,
        vote_average: s.vote_average,
        genre_ids: s.genre_ids,
      };
    }
    const mv = m as TMDBMovie;
    return {
      id: mv.id,
      title: mv.title,
      overview: mv.overview,
      poster_path: mv.poster_path,
      release_date: mv.release_date,
      vote_average: mv.vote_average,
      genre_ids: mv.genre_ids,
    };
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const type = (req.query.type as string) || "movie";
    const isTV = type === "tv";
    let page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);

    const params: Record<string, string> = {
      include_adult: "false",
      sort_by: "popularity.desc",
    };

    const q = req.query;

    if (isTV) {
      if (q["first_air_date.gte"]) {
        params["first_air_date.gte"] = String(q["first_air_date.gte"]);
      }
    } else {
      if (q["primary_release_date.gte"]) {
        params["primary_release_date.gte"] = String(
          q["primary_release_date.gte"],
        );
      }
    }

    if (q["vote_average.gte"]) {
      params["vote_average.gte"] = String(q["vote_average.gte"]);
    }
    if (q["with_genres"]) {
      params["with_genres"] = String(q["with_genres"]);
    }
    if (q["with_watch_providers"]) {
      params["with_watch_providers"] = String(q["with_watch_providers"]);
      params["watch_region"] = String(q["watch_region"] || "US");
      params["with_watch_monetization_types"] = "flatrate";
    }

    const discover = isTV ? discoverTVShows : discoverMovies;

    let filtered: (TMDBMovie | TMDBTVShow)[] = [];

    while (true) {
      const data = await discover({ ...params, page: String(page) });

      if (data.results.length === 0) {
        res.setHeader("Cache-Control", CDN_MEDIUM);
        return res.status(200).json({ results: [], nextPage: null });
      }

      filtered = data.results.filter(
        (m) => m.poster_path && m.overview && m.vote_average > 0,
      );

      page++;

      if (filtered.length > 0 || page > data.total_pages) break;
    }

    res.setHeader("Cache-Control", CDN_MEDIUM);
    return res.status(200).json({
      results: slimDiscoverResults(filtered, isTV),
      nextPage: filtered.length > 0 ? page : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch";
    return res.status(500).json({ error: msg });
  }
}
