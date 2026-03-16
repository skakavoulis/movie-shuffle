import type { NextApiRequest, NextApiResponse } from "next";
import { getWatchProviderRegions } from "@/lib/tmdb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = await getWatchProviderRegions();
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate");
    return res.status(200).json(data.results ?? []);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch regions";
    return res.status(500).json({ error: msg });
  }
}
