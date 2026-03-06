import type { NextApiRequest, NextApiResponse } from "next";
import { searchMulti, searchResultToMediaItem } from "@/lib/tmdb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const q = (req.query.q as string)?.trim();
  if (!q) {
    return res.status(200).json([]);
  }

  try {
    const data = await searchMulti(q);
    const items = data.results
      .map(searchResultToMediaItem)
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return res.status(200).json(items);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search failed";
    return res.status(500).json({ error: message });
  }
}
