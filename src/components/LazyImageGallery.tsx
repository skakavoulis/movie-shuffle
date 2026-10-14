import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { imageUrl } from "@/lib/tmdb";
import type { GalleryImage, ImagesBody } from "@/pages/api/images";

type ImageKind = "backdrops" | "posters" | "logos" | "profiles";

type LoadState = "loading" | "loaded" | "error";

interface KindConfig {
  label: string;
  /** How many tiles show before "Show all". */
  preview: number;
  gridClass: string;
  tileClass: string;
  thumbSize: Parameters<typeof imageUrl>[1];
  /** Size of the first tile, which the backdrop grid shows larger. */
  featureSize?: Parameters<typeof imageUrl>[1];
  fullSize: Parameters<typeof imageUrl>[1];
  sizes: string;
}

const KINDS: Record<ImageKind, KindConfig> = {
  backdrops: {
    label: "Backdrops",
    // One feature tile plus eight fills three rows of the four-column grid.
    preview: 9,
    gridClass: "grid-cols-2 md:grid-cols-4",
    tileClass: "aspect-video",
    thumbSize: "w300",
    featureSize: "w780",
    fullSize: "w1280",
    sizes: "(max-width: 768px) 50vw, 25vw",
  },
  posters: {
    label: "Posters",
    preview: 12,
    gridClass: "grid-cols-3 sm:grid-cols-4 md:grid-cols-6",
    tileClass: "aspect-[2/3]",
    thumbSize: "w342",
    fullSize: "w780",
    sizes: "(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw",
  },
  logos: {
    label: "Logos",
    preview: 8,
    gridClass: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
    tileClass: "aspect-video logo-tile",
    thumbSize: "w300",
    fullSize: "original",
    sizes: "(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw",
  },
  profiles: {
    label: "Photos",
    preview: 12,
    gridClass: "grid-cols-3 sm:grid-cols-4 md:grid-cols-6",
    tileClass: "aspect-[2/3]",
    thumbSize: "h632",
    fullSize: "original",
    sizes: "(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw",
  },
};

const KIND_ORDER: ImageKind[] = ["backdrops", "posters", "logos", "profiles"];

interface LazyImageGalleryProps {
  /** Endpoint returning ImagesBody, requested only once the section is near. */
  src: string;
  /** Used in alt text, e.g. the title or person's name. */
  name: string;
  heading?: string;
}

function GallerySkeleton() {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-3"
      aria-busy
      aria-label="Loading images"
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className={`rounded-lg bg-bg-secondary skeleton-shimmer ${
            i === 0
              ? "col-span-2 aspect-video md:row-span-2 md:aspect-auto"
              : "aspect-video"
          }`}
          style={{ "--shimmer-delay": `${i * 0.08}s` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function singular(kind: ImageKind) {
  return KINDS[kind].label.toLowerCase().replace(/s$/, "");
}

/** e.g. "inception-backdrop-3.jpg" */
function downloadFilename(
  name: string,
  kind: ImageKind,
  index: number,
  filePath: string,
) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const ext = filePath.split(".").pop() ?? "jpg";
  return `${base || "image"}-${singular(kind)}-${index + 1}.${ext}`;
}

interface DownloadButtonProps {
  image: GalleryImage;
  kind: ImageKind;
  index: number;
  name: string;
  className: string;
  children?: React.ReactNode;
}

/**
 * `<a download>` is ignored for cross-origin URLs, so the original is fetched
 * as a blob first (TMDB's image CDN allows CORS). If that fails, the image
 * opens in a new tab instead so it can still be saved by hand.
 */
function DownloadButton({
  image,
  kind,
  index,
  name,
  className,
  children,
}: DownloadButtonProps) {
  const [busy, setBusy] = useState(false);
  const url = imageUrl(image.file_path, "original");

  async function download(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Download failed");
      const objectUrl = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = downloadFilename(name, kind, index, image.file_path);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      className={className}
      aria-label={`Download ${singular(kind)} ${index + 1}`}
      aria-busy={busy}
    >
      {busy ? (
        <span
          className="block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
          aria-hidden
        />
      ) : (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

interface LightboxProps {
  images: GalleryImage[];
  kind: ImageKind;
  index: number;
  name: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

function Lightbox({
  images,
  kind,
  index,
  name,
  onIndexChange,
  onClose,
}: LightboxProps) {
  const cfg = KINDS[kind];
  const image = images[index];
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);

  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;
  const prev = useCallback(() => {
    if (hasPrev) onIndexChange(index - 1);
  }, [hasPrev, index, onIndexChange]);
  const next = useCallback(() => {
    if (hasNext) onIndexChange(index + 1);
  }, [hasNext, index, onIndexChange]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, prev, next]);

  // Warm the neighbours so stepping through feels instant.
  useEffect(() => {
    for (const i of [index - 1, index + 1]) {
      const neighbour = images[i];
      if (neighbour) {
        const img = new window.Image();
        img.src = imageUrl(neighbour.file_path, cfg.fullSize);
      }
    }
  }, [images, index, cfg.fullSize]);

  if (!image) return null;
  const loaded = loadedPath === image.file_path;

  // Portalled out of the page, whose z-indexed content wrapper would
  // otherwise keep the overlay beneath the fixed site header.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-label={`${name} ${cfg.label.toLowerCase()}`}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (dx > 50) prev();
        else if (dx < -50) next();
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 text-sm text-white/70">
        <span className="tabular-nums">
          {index + 1} / {images.length}
        </span>
        <div className="flex items-center gap-1">
          <DownloadButton
            image={image}
            kind={kind}
            index={index}
            name={name}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
          >
            <span className="hidden sm:inline">Download</span>
          </DownloadButton>
          <a
            href={imageUrl(image.file_path, "original")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            <span className="hidden sm:inline">Original</span>
            <span className="text-white/40 tabular-nums">
              {image.width}×{image.height}
            </span>
          </a>
          <button
            ref={closeRef}
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Stage */}
      <div
        className="relative flex-1 min-h-0 flex items-center justify-center px-4 md:px-20 pb-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {!loaded && (
          <div
            className="absolute w-10 h-10 rounded-full border-2 border-white/20 border-t-white/80 animate-spin"
            aria-hidden
          />
        )}
        <Image
          key={image.file_path}
          src={imageUrl(image.file_path, cfg.fullSize)}
          alt={`${name} ${singular(kind)} ${index + 1}`}
          width={image.width}
          height={image.height}
          sizes="100vw"
          onLoad={() => setLoadedPath(image.file_path)}
          className={`max-w-full max-h-[calc(100dvh-5.5rem)] w-auto h-auto object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          } ${kind === "logos" ? "logo-tile p-6 md:p-10" : ""}`}
        />

        {hasPrev && (
          <button
            onClick={prev}
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 p-2 md:p-3 rounded-full bg-black/50 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
            aria-label="Previous image"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}
        {hasNext && (
          <button
            onClick={next}
            className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 p-2 md:p-3 rounded-full bg-black/50 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
            aria-label="Next image"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * TMDB's artwork for a title or person: tabs per image kind, a grid that
 * previews the first few, and a lightbox for browsing them full size. Like
 * LazyVideosCarousel, the lookup waits until the section is about to scroll
 * into view, and the section disappears when TMDB has nothing.
 */
export default function LazyImageGallery({
  src,
  name,
  heading = "Images",
}: LazyImageGalleryProps) {
  const [data, setData] = useState<ImagesBody | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [attempt, setAttempt] = useState(0);
  const [visible, setVisible] = useState(false);
  const [selectedKind, setSelectedKind] = useState<ImageKind | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
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
      // See LazyVideosCarousel: also loads once the section is above the
      // viewport.
      { rootMargin: "100000px 0px 300px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      })
      .then((body: ImagesBody) => {
        if (cancelled) return;
        setData(body);
        setLoadState("loaded");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [visible, src, attempt]);

  const kinds = data ? KIND_ORDER.filter((k) => data[k].length > 0) : [];
  const kind =
    selectedKind && kinds.includes(selectedKind) ? selectedKind : kinds[0];
  const images = kind && data ? data[kind] : [];
  const cfg = kind ? KINDS[kind] : null;

  const closeLightbox = useCallback(() => setOpenIndex(null), []);

  let body: React.ReactNode;
  if (!visible || loadState === "loading") {
    body = <GallerySkeleton />;
  } else if (loadState === "error") {
    body = (
      <div className="flex items-center gap-3 py-8 justify-center rounded-xl bg-white/[0.02] ring-1 ring-white/10">
        <p className="text-sm text-text-muted">Could not load images.</p>
        <button
          onClick={() => {
            setLoadState("loading");
            setAttempt((n) => n + 1);
          }}
          className="text-sm text-accent hover:text-accent-hover font-medium transition-colors"
        >
          Try again
        </button>
      </div>
    );
  } else if (!kind || !cfg) {
    // Nothing to show; keep only the sentinel.
    return <div ref={sentinelRef} aria-hidden />;
  } else {
    const shown = expanded ? images : images.slice(0, cfg.preview);
    body = (
      <>
        <div className={`grid gap-3 ${cfg.gridClass}`}>
          {shown.map((img, i) => {
            const feature = kind === "backdrops" && i === 0;
            return (
              <div
                key={img.file_path}
                className={`group relative overflow-hidden rounded-lg bg-bg-card ring-1 ring-white/5 hover:ring-accent/50 has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-accent transition-all ${
                  feature
                    ? "col-span-2 aspect-video md:row-span-2 md:aspect-auto"
                    : cfg.tileClass
                }`}
              >
                <button
                  onClick={() => setOpenIndex(i)}
                  className="absolute inset-0 outline-none"
                  aria-label={`View ${singular(kind)} ${i + 1} of ${images.length}`}
                >
                  <Image
                    src={imageUrl(
                      img.file_path,
                      feature && cfg.featureSize
                        ? cfg.featureSize
                        : cfg.thumbSize,
                    )}
                    alt=""
                    fill
                    sizes={
                      feature ? "(max-width: 768px) 100vw, 50vw" : cfg.sizes
                    }
                    className={`transition-transform duration-500 group-hover:scale-105 ${
                      kind === "logos"
                        ? "object-contain p-4 md:p-6"
                        : "object-cover"
                    }`}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </button>
                {/* Always visible on touch screens, which have no hover. */}
                <DownloadButton
                  image={img}
                  kind={kind}
                  index={i}
                  name={name}
                  className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white/90 backdrop-blur-sm hover:bg-accent hover:text-white focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white outline-none transition-all opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                />
              </div>
            );
          })}
        </div>
        {images.length > cfg.preview && (
          <div className="flex justify-center mt-5">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="px-5 py-2 rounded-full border border-border text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              {expanded
                ? "Show less"
                : `Show all ${images.length} ${cfg.label.toLowerCase()}`}
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <section className="mt-12">
      <div ref={sentinelRef} aria-hidden />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {kinds.length > 1 && (
          <div
            className="flex gap-1 p-1 rounded-full bg-white/5 overflow-x-auto hide-scrollbar"
            role="tablist"
          >
            {kinds.map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={k === kind}
                onClick={() => {
                  setSelectedKind(k);
                  setExpanded(false);
                }}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  k === kind
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {KINDS[k].label}
                <span
                  className={`ml-1.5 tabular-nums ${
                    k === kind ? "text-white/70" : "text-text-muted"
                  }`}
                >
                  {data![k].length}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {body}

      {kind && openIndex !== null && (
        <Lightbox
          images={images}
          kind={kind}
          index={openIndex}
          name={name}
          onIndexChange={setOpenIndex}
          onClose={closeLightbox}
        />
      )}
    </section>
  );
}
