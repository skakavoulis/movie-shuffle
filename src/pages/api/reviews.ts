import type { NextApiRequest, NextApiResponse } from "next";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { REVIEW_MAX_LENGTH, type SiteReview } from "@/lib/reviews";

const COLUMNS =
  "id, user_id, rating, content, author_name, author_avatar, created_at, updated_at";

type ReviewRow = Omit<SiteReview, "is_own"> & { user_id: string };

function toSiteReview(row: ReviewRow, userId: string | undefined): SiteReview {
  const { user_id, ...rest } = row;
  return { ...rest, is_own: user_id === userId };
}

function parseTitle(mediaType: unknown, mediaId: unknown) {
  const id = Number(mediaId);
  if ((mediaType !== "movie" && mediaType !== "tv") || !Number.isInteger(id) || id < 1) {
    return null;
  }
  return { mediaType, mediaId: id } as const;
}

/** Name and avatar shown on the review; profiles themselves are private. */
async function authorOf(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  user: User,
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const meta = user.user_metadata ?? {};
  const name =
    profile?.display_name?.trim() ||
    String(meta.full_name ?? meta.name ?? "").trim() ||
    "JustPickAMovie member";
  const avatar =
    profile?.avatar_url?.trim() || String(meta.avatar_url ?? "").trim() || null;
  return { name, avatar };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (req.method === "GET") {
    const title = parseTitle(req.query.media_type, req.query.media_id);
    if (!title) {
      return res
        .status(400)
        .json({ error: "media_type and media_id are required" });
    }

    const { data, error } = await supabase
      .from("reviews")
      .select(COLUMNS)
      .eq("media_type", title.mediaType)
      .eq("media_id", title.mediaId)
      .order("created_at", { ascending: false })
      .returns<ReviewRow[]>();

    if (error) return res.status(500).json({ error: error.message });
    // `is_own` depends on who is asking, so the response can't be shared.
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).json(data.map((r) => toSiteReview(r, user?.id)));
  }

  if (!user) {
    return res.status(401).json({ error: "Sign in to write a review" });
  }

  if (req.method === "POST") {
    const title = parseTitle(req.body?.media_type, req.body?.media_id);
    const rating = Number(req.body?.rating);
    const content =
      typeof req.body?.content === "string" ? req.body.content.trim() : "";

    if (!title) {
      return res
        .status(400)
        .json({ error: "media_type and media_id are required" });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
      return res.status(400).json({ error: "Pick a rating" });
    }
    if (!content) {
      return res.status(400).json({ error: "Write something about it" });
    }
    if (content.length > REVIEW_MAX_LENGTH) {
      return res.status(400).json({
        error: `Reviews can be up to ${REVIEW_MAX_LENGTH} characters`,
      });
    }

    const author = await authorOf(supabase, user);
    const { data, error } = await supabase
      .from("reviews")
      .upsert(
        {
          user_id: user.id,
          media_id: title.mediaId,
          media_type: title.mediaType,
          rating,
          content,
          author_name: author.name,
          author_avatar: author.avatar,
        },
        { onConflict: "user_id,media_id,media_type" },
      )
      .select(COLUMNS)
      .single<ReviewRow>();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(toSiteReview(data, user.id));
  }

  if (req.method === "DELETE") {
    const title = parseTitle(req.query.media_type, req.query.media_id);
    if (!title) {
      return res
        .status(400)
        .json({ error: "media_type and media_id are required" });
    }

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("user_id", user.id)
      .eq("media_type", title.mediaType)
      .eq("media_id", title.mediaId);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
