import type { NextApiRequest, NextApiResponse } from "next";
import { getMovieNews, searchMovieNews } from "@/lib/news";
import { CDN_MEDIUM } from "@/lib/cdnCache";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const country = (req.query.country as string)?.trim() || "us";
  const q = (req.query.q as string)?.trim();

  try {
    if (q) {
      const articles = await searchMovieNews(q, country);
      res.setHeader("Cache-Control", CDN_MEDIUM);
      return res.status(200).json(articles);
    }

    const articles = await getMovieNews(country, 6);
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).json(articles);
  } catch {
    return res.status(500).json({ error: "Failed to fetch movie news" });
  }
}
