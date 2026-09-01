import type { NextApiRequest, NextApiResponse } from "next";
import { searchMulti, searchResultToSearchItem } from "@/lib/tmdb";
import { CDN_MEDIUM } from "@/lib/cdnCache";

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
      .map(searchResultToSearchItem)
      .filter((item): item is NonNullable<typeof item> => item !== null);

    res.setHeader("Cache-Control", CDN_MEDIUM);
    return res.status(200).json(items);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search failed";
    return res.status(500).json({ error: message });
  }
}
