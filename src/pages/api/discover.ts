import type { NextApiRequest, NextApiResponse } from "next";
import { discoverMovies, discoverTVShows } from "@/lib/tmdb";

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
    const firstPage = await discover({ ...params, page: "1" });
    const maxPage = Math.min(firstPage.total_pages, 30);

    const randomPage =
      maxPage > 1 ? Math.floor(Math.random() * maxPage) + 1 : 1;

    const data =
      randomPage === 1
        ? firstPage
        : await discover({ ...params, page: String(randomPage) });

    const filtered = data.results.filter(
      (m) => m.poster_path && m.overview && m.vote_average > 0,
    );

    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(filtered);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch";
    return res.status(500).json({ error: msg });
  }
}
