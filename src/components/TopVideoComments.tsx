import { useState, useEffect } from "react";
import type { YouTubeComment } from "@/lib/youtube";

export type CommentsState =
  | { status: "loading" }
  | { status: "loaded"; comments: YouTubeComment[] }
  | { status: "error" };

/**
 * Comments already fetched this visit, so flicking back to a video doesn't
 * spend another API call, and whether the API is set up at all.
 */
const loadedComments = new Map<string, YouTubeComment[]>();
let apiUnavailable = false;

/**
 * Loads the top comments for `videoKey`. `available` turns false when the
 * server has no YouTube API key, so the caller can drop the column.
 */
export function useTopVideoComments(videoKey: string) {
  const [available, setAvailable] = useState(!apiUnavailable);
  const [result, setResult] = useState<{ key: string; state: CommentsState }>({
    key: "",
    state: { status: "loading" },
  });

  useEffect(() => {
    if (!videoKey || apiUnavailable || loadedComments.has(videoKey)) return;
    let cancelled = false;
    fetch(`/api/video-comments?videoId=${encodeURIComponent(videoKey)}`)
      .then(async (r) => {
        if (r.status === 501) {
          apiUnavailable = true;
          if (!cancelled) setAvailable(false);
          return;
        }
        if (!r.ok) throw new Error("Request failed");
        const data: { comments: YouTubeComment[] } = await r.json();
        loadedComments.set(videoKey, data.comments);
        if (!cancelled) {
          setResult({
            key: videoKey,
            state: { status: "loaded", comments: data.comments },
          });
        }
      })
      .catch(() => {
        if (!cancelled)
          setResult({ key: videoKey, state: { status: "error" } });
      });
    return () => {
      cancelled = true;
    };
  }, [videoKey]);

  let state: CommentsState = { status: "loading" };
  const cachedComments = loadedComments.get(videoKey);
  if (cachedComments) {
    state = { status: "loaded", comments: cachedComments };
  } else if (result.key === videoKey) {
    state = result.state;
  }
  return { available, state };
}

const compact = new Intl.NumberFormat("en", { notation: "compact" });

function ThumbsUpIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 11v9H4a1 1 0 01-1-1v-7a1 1 0 011-1h3zm0 0l4-8a2 2 0 012 2v4h5.5a2 2 0 012 2.3l-1.2 7A2 2 0 0117.3 20H7"
      />
    </svg>
  );
}

function CommentsSkeleton() {
  return (
    <div className="space-y-5" aria-busy aria-label="Loading comments">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-bg-secondary skeleton-shimmer" />
            <div className="h-3.5 w-24 rounded bg-bg-secondary skeleton-shimmer" />
          </div>
          {[100, 75].map((w, j) => (
            <div
              key={j}
              className="h-3 rounded bg-bg-secondary skeleton-shimmer"
              style={
                {
                  width: `${w}%`,
                  "--shimmer-delay": `${0.12 * (i * 2 + j + 1)}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Comment({
  comment,
  videoKey,
}: {
  comment: YouTubeComment;
  videoKey: string;
}) {
  const initial = comment.author.replace(/^@/, "")[0]?.toUpperCase() ?? "?";
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2.5 min-w-0">
        {comment.authorAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={comment.authorAvatar}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full object-cover bg-bg-primary flex-shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent text-xs font-semibold flex-shrink-0">
            {initial}
          </div>
        )}
        <a
          href={`https://www.youtube.com/watch?v=${videoKey}&lc=${comment.id}`}
          target="_blank"
          rel="noopener noreferrer"
          title="View on YouTube"
          className="min-w-0 truncate text-sm font-medium text-text-primary hover:text-accent transition-colors"
        >
          {comment.author}
        </a>
        <span className="ml-auto flex flex-shrink-0 items-center gap-1 text-xs text-text-muted">
          <ThumbsUpIcon />
          {compact.format(comment.likeCount)}
        </span>
      </div>
      <p className="mt-2 text-sm text-text-primary/85 leading-relaxed whitespace-pre-line break-words">
        {comment.text}
      </p>
    </li>
  );
}

/** The most-liked YouTube comments on the video that's playing. */
export default function TopVideoComments({
  videoKey,
  state,
}: {
  videoKey: string;
  state: CommentsState;
}) {
  return (
    <aside aria-label="Top YouTube comments" className="relative mt-4 lg:mt-0">
      {/* Pinned to the player's height on desktop; the bottom inset clears
          the title row under the player. */}
      <div className="flex flex-col max-h-[28rem] lg:max-h-none lg:absolute lg:inset-x-0 lg:top-0 lg:bottom-8 rounded-xl bg-bg-card border border-border">
        <p className="px-5 pt-5 pb-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Top comments
        </p>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">
          {state.status === "loading" ? (
            <CommentsSkeleton />
          ) : state.status === "error" ? (
            <p className="text-sm text-text-muted">
              Couldn&apos;t load comments.
            </p>
          ) : state.comments.length > 0 ? (
            <ol className="divide-y divide-border">
              {state.comments.map((comment) => (
                <Comment
                  key={comment.id}
                  comment={comment}
                  videoKey={videoKey}
                />
              ))}
            </ol>
          ) : (
            <p className="text-sm text-text-muted">
              No comments on this video.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
