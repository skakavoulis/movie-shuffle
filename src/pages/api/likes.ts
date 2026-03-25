import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export interface LikeRow {
  id: string;
  media_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  created_at: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: "Sign in to manage likes" });
  }

  if (req.method === "GET") {
    const mediaType = req.query.media_type as string | undefined;
    let query = supabase
      .from("likes")
      .select("id, media_id, media_type, title, poster_path")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (mediaType === "movie" || mediaType === "tv") {
      query = query.eq("media_type", mediaType);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    const { media_id, media_type, title, poster_path } = req.body;

    if (!media_id || !media_type || !title) {
      return res
        .status(400)
        .json({ error: "media_id, media_type, and title are required" });
    }
    if (media_type !== "movie" && media_type !== "tv") {
      return res
        .status(400)
        .json({ error: "media_type must be 'movie' or 'tv'" });
    }

    const { data, error } = await supabase
      .from("likes")
      .upsert(
        {
          user_id: user.id,
          media_id,
          media_type,
          title,
          poster_path: poster_path ?? null,
        },
        { onConflict: "user_id,media_id,media_type" },
      )
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === "DELETE") {
    const media_id = Number(req.query.media_id);
    const media_type = req.query.media_type as string;

    if (!media_id || !media_type) {
      return res
        .status(400)
        .json({ error: "media_id and media_type are required" });
    }

    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("user_id", user.id)
      .eq("media_id", media_id)
      .eq("media_type", media_type);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
