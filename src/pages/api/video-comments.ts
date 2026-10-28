import type { NextApiRequest, NextApiResponse } from "next";
import {
  getTopYouTubeComments,
  isYouTubeApiConfigured,
  type YouTubeComment,
} from "@/lib/youtube";
import { CDN_LONG } from "@/lib/cdnCache";

type OkBody = { comments: YouTubeComment[] };

/** YouTube video ids are 11 URL-safe base64 characters. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OkBody | { error: string }>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const videoId = req.query.videoId;
  if (typeof videoId !== "string" || !VIDEO_ID.test(videoId)) {
    return res.status(400).json({ error: "Invalid videoId" });
  }

  // Lets the player drop its comments column instead of showing it empty.
  if (!isYouTubeApiConfigured()) {
    return res.status(501).json({ error: "YouTube API not configured" });
  }

  try {
    const comments = await getTopYouTubeComments(videoId);
    res.setHeader("Cache-Control", CDN_LONG);
    return res.status(200).json({ comments });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load comments";
    return res.status(500).json({ error: msg });
  }
}
