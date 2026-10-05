import { useState, useEffect, useRef } from "react";
import type { TMDBVideo } from "@/lib/tmdb";
import AdditionalVideosCarousel from "@/components/AdditionalVideosCarousel";

interface LazyVideosCarouselProps {
  /** Videos already on the page, e.g. from a title's TMDB payload. */
  videos?: TMDBVideo[];
  /**
   * Endpoint returning `{ videos }`, requested only once the section is near.
   * Its results are appended to `videos`.
   */
  src?: string;
  paused?: boolean;
}

type LoadState = "loading" | "loaded" | "error";

/**
 * Mirrors AdditionalVideosCarousel's layout (player, title row, thumbnail
 * strip) so swapping between states doesn't shift the page. With a message
 * it shows that in the player area and keeps the other rows as invisible
 * spacers; without one it renders as a loading skeleton.
 */
function VideosPlaceholder({ message }: { message?: React.ReactNode }) {
  const loading = !message;
  const fill = loading ? "bg-bg-secondary skeleton-shimmer" : "invisible";
  return (
    <section
      className="mt-12"
      aria-busy={loading}
      aria-label={loading ? "Loading videos" : undefined}
    >
      <div
        className={`w-full max-w-4xl mx-auto aspect-video rounded-xl flex items-center justify-center gap-3 ${
          loading
            ? "bg-bg-secondary skeleton-shimmer"
            : "bg-white/[0.02] ring-1 ring-white/10"
        }`}
      >
        {message ?? (
          <svg
            className="w-14 h-14 text-text-muted animate-breathe"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <div
        className={`h-5 w-48 mx-auto mt-3 rounded ${fill}`}
        style={{ "--shimmer-delay": "0.15s" } as React.CSSProperties}
      />
      <div
        className="flex gap-3 mt-4 overflow-hidden pb-2 p-[3px]"
        aria-hidden
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`flex-shrink-0 w-[160px] md:w-[200px] aspect-video rounded-lg ${fill}`}
            // Ripple the shimmer along the strip.
            style={
              { "--shimmer-delay": `${0.3 + i * 0.12}s` } as React.CSSProperties
            }
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Mounts the videos carousel only once it is about to scroll into view, so
 * neither the YouTube player nor a `src` lookup is paid for by visitors (and
 * crawlers) that never reach it. Person videos come from a YouTube scrape,
 * which is too CPU-heavy to run on every server render.
 */
export default function LazyVideosCarousel({
  videos: initialVideos,
  src,
  paused,
}: LazyVideosCarouselProps) {
  const [fetched, setFetched] = useState<TMDBVideo[]>([]);
  const [loadState, setLoadState] = useState<LoadState>(
    src ? "loading" : "loaded",
  );
  const [attempt, setAttempt] = useState(0);
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      // The huge top margin also counts the section as reached once it is
      // above the viewport, so jumping past it (End key, anchor links)
      // still loads it.
      { rootMargin: "100000px 0px 200px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !src) return;
    let cancelled = false;
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      })
      .then((data: { videos?: TMDBVideo[] }) => {
        if (cancelled) return;
        setFetched(data.videos ?? []);
        setLoadState("loaded");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [visible, src, attempt]);

  // Initial videos lead; fetched ones follow, minus any already shown.
  const seen = new Set<string>();
  const videos = [...(initialVideos ?? []), ...fetched].filter((v) => {
    if (seen.has(v.key)) return false;
    seen.add(v.key);
    return true;
  });

  let content: React.ReactNode = null;
  if (!visible) {
    content = null;
  } else if (videos.length > 0) {
    // Videos already on the page show straight away; fetched ones are
    // appended when they arrive, and a failed fetch just leaves them alone.
    content = <AdditionalVideosCarousel videos={videos} paused={paused} />;
  } else if (loadState === "loading") {
    content = <VideosPlaceholder />;
  } else if (loadState === "error") {
    content = (
      <VideosPlaceholder
        message={
          <>
            <p className="text-sm text-text-muted">Could not load videos.</p>
            <button
              onClick={() => {
                setLoadState("loading");
                setAttempt((n) => n + 1);
              }}
              className="text-sm text-accent hover:text-accent-hover font-medium transition-colors"
            >
              Try again
            </button>
          </>
        }
      />
    );
  } else {
    content = (
      <VideosPlaceholder
        message={
          <p className="text-sm text-text-muted">No videos available.</p>
        }
      />
    );
  }

  return (
    <>
      <div ref={sentinelRef} aria-hidden />
      {content}
    </>
  );
}
