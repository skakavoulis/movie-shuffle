import { useState, useEffect, useRef, useCallback } from "react";
import type { TMDBVideo } from "@/lib/tmdb";

interface AdditionalVideosCarouselProps {
  videos: TMDBVideo[];
}

export default function AdditionalVideosCarousel({
  videos,
}: AdditionalVideosCarouselProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const goToNext = useCallback(() => {
    setActiveIdx((prev) => (prev + 1) % videos.length);
  }, [videos.length]);

  const goToPrev = useCallback(() => {
    setActiveIdx((prev) => (prev - 1 + videos.length) % videos.length);
  }, [videos.length]);

  const initYouTubeListener = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: "listening" }),
      "https://www.youtube.com",
    );
    iframe.contentWindow.postMessage(
      JSON.stringify({
        event: "command",
        func: "addEventListener",
        args: ["onStateChange"],
      }),
      "https://www.youtube.com",
    );
    iframe.contentWindow.postMessage(
      JSON.stringify({
        event: "command",
        func: "addEventListener",
        args: ["onError"],
      }),
      "https://www.youtube.com",
    );
  }, []);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== "https://www.youtube.com") return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data.event === "onStateChange" && data.info === 0) {
          goToNext();
        }
        if (data.event === "onError") {
          goToNext();
        }
      } catch {
        // ignore non-JSON messages
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [goToNext]);

  const activeVideo = videos[activeIdx];

  return (
    <section className="mt-12">
      <h2 className="text-xl md:text-2xl font-bold text-text-primary mb-6">
        Additional Videos
      </h2>

      <div className="relative group">
        <div className="relative w-full max-w-4xl mx-auto aspect-video rounded-xl overflow-hidden shadow-2xl bg-black ring-1 ring-white/10">
          <iframe
            ref={iframeRef}
            key={activeVideo.id}
            onLoad={initYouTubeListener}
            src={`https://www.youtube.com/embed/${activeVideo.key}?${isDesktop ? "autoplay=1&mute=1&" : ""}rel=0&enablejsapi=1`}
            title={activeVideo.name}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>

        <div className="flex items-center justify-center gap-2 mt-3">
          <p className="text-sm font-medium text-text-primary truncate">
            {activeVideo.name}
          </p>
          <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-white/5 text-text-muted text-xs">
            {activeVideo.type}
          </span>
        </div>

        {videos.length > 1 && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all"
              aria-label="Previous video"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all"
              aria-label="Next video"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          </>
        )}
      </div>

      {videos.length > 1 && (
        <div className="flex gap-3 mt-4 overflow-x-auto hide-scrollbar pb-2 max-w-4xl mx-auto">
          {videos.map((video, idx) => (
            <button
              key={video.id}
              onClick={() => setActiveIdx(idx)}
              className={`flex-shrink-0 relative w-[160px] md:w-[200px] aspect-video rounded-lg overflow-hidden transition-all ${
                idx === activeIdx
                  ? "ring-2 ring-accent shadow-lg shadow-accent/20 scale-[1.02]"
                  : "ring-1 ring-white/10 opacity-60 hover:opacity-90"
              }`}
            >
              <img
                src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`}
                alt={video.name}
                className="w-full h-full object-cover"
              />
              {idx === activeIdx && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
              <p className="absolute bottom-0 inset-x-0 px-2 py-1 bg-gradient-to-t from-black/80 to-transparent text-[11px] text-white truncate">
                {video.name}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
