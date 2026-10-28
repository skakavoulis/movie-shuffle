import { useState } from "react";
import Link from "next/link";
import type { TMDBKeyword } from "@/lib/tmdb";

const INITIAL_COUNT = 10;

/** Mid- and post-credits scene tags, which say nothing about the story. */
const HIDDEN_KEYWORD = /stinger/i;

interface KeywordChipsProps {
  mediaType: "movie" | "tv";
  /** The title the chips belong to, left out of the Discover deck they open. */
  mediaId: number;
  keywords: TMDBKeyword[];
}

export function discoverKeywordHref(
  mediaType: "movie" | "tv",
  keyword: TMDBKeyword,
  excludeId?: number,
) {
  const params = new URLSearchParams({
    type: mediaType,
    keyword: String(keyword.id),
    keywordName: keyword.name.trim(),
  });
  if (excludeId) params.set("exclude", String(excludeId));
  return `/discover?${params}`;
}

/**
 * TMDB keywords as chips that each open a Discover deck of titles sharing
 * that keyword. TMDB lists topical keywords first and mood words last, so
 * the collapsed view keeps the most specific ones.
 */
export default function KeywordChips({
  mediaType,
  mediaId,
  keywords,
}: KeywordChipsProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = keywords.filter((k) => !HIDDEN_KEYWORD.test(k.name));
  if (visible.length === 0) return null;

  const shown = expanded ? visible : visible.slice(0, INITIAL_COUNT);
  const hiddenCount = visible.length - shown.length;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-[15px]">
      {shown.map((k) => (
        <Link
          key={k.id}
          href={discoverKeywordHref(mediaType, k, mediaId)}
          title={`Swipe through more ${mediaType === "movie" ? "movies" : "shows"} tagged “${k.name.trim()}”`}
          className="group font-medium text-yellow-400 hover:text-yellow-300 underline decoration-yellow-400/30 hover:decoration-yellow-300 underline-offset-4 transition-colors"
        >
          <span className="text-yellow-400/60 group-hover:text-yellow-300">
            #
          </span>
          {k.name.trim()}
        </Link>
      ))}
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-text-secondary hover:text-white transition-colors"
        >
          +{hiddenCount} more
        </button>
      )}
    </div>
  );
}
