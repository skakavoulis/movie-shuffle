import type { NextApiRequest, NextApiResponse } from "next";
import {
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
} from "@/lib/tmdb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const lists = [getPopularMovies, getTopRatedMovies, getNowPlayingMovies];
    const listFn = lists[Math.floor(Math.random() * lists.length)];
    const page1 = Math.floor(Math.random() * 20) + 1;
    let page2 = Math.floor(Math.random() * 20) + 1;
    while (page2 === page1) page2 = Math.floor(Math.random() * 20) + 1;

    const [r1, r2] = await Promise.all([listFn(page1), listFn(page2)]);
    const all = [...r1.results, ...r2.results];

    const filtered = all.filter(
      (m) => m.poster_path && m.overview && m.vote_average > 0,
    );

    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(filtered.slice(0, 20));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch movies";
    return res.status(500).json({ error: msg });
  }
}
