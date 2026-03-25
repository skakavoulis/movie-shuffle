import { useState, useRef, useCallback, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import type { GetStaticProps } from "next";
import Layout from "@/components/Layout";
import {
  posterUrl,
  movieHref,
  tvHref,
  type TMDBMovie,
  type TMDBTVShow,
  type TMDBGenre,
  type TMDBWatchProvider,
} from "@/lib/tmdb";
import { useLikes } from "@/context/LikesContext";
import { useAuth } from "@/context/AuthContext";
import DiscoverFiltersModal, {
  DEFAULT_FILTERS,
  activeFilterCount,
  type DiscoverFilters,
} from "@/components/DiscoverFiltersModal";
import { useRegion } from "@/context/RegionContext";

type DiscoverMediaType = "movie" | "tv";
type DiscoverSlimMovie = Pick<
  TMDBMovie,
  | "id"
  | "title"
  | "overview"
  | "poster_path"
  | "release_date"
  | "vote_average"
  | "genre_ids"
>;
type DiscoverSlimTV = Pick<
  TMDBTVShow,
  | "id"
  | "name"
  | "overview"
  | "poster_path"
  | "first_air_date"
  | "vote_average"
  | "genre_ids"
>;
type DiscoverItem = DiscoverSlimMovie | DiscoverSlimTV;

function isMovie(item: DiscoverItem): item is DiscoverSlimMovie {
  return "title" in item && "release_date" in item;
}

const STORAGE_KEY_FILTERS = "discover-filters";
const STORAGE_KEY_MEDIA_TYPE = "discover-media-type";

function loadFilters(): DiscoverFilters | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FILTERS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.releaseYearGte === "string" &&
      typeof parsed.voteAverageGte === "number" &&
      Array.isArray(parsed.genreIds) &&
      Array.isArray(parsed.providerIds)
    ) {
      return parsed as DiscoverFilters;
    }
  } catch {}
  return null;
}

function loadMediaType(): DiscoverMediaType | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEDIA_TYPE);
    if (raw === "movie" || raw === "tv") return raw;
  } catch {}
  return null;
}

const SWIPE_THRESHOLD = 80;

const MOVIE_GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

const TV_GENRE_MAP: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

function buildFilterParams(
  mediaType: DiscoverMediaType,
  filters: DiscoverFilters,
  region: string,
): string {
  const params = new URLSearchParams();
  params.set("type", mediaType);
  if (filters.releaseYearGte) {
    const date = `${filters.releaseYearGte}-01-01`;
    if (mediaType === "tv") {
      params.set("first_air_date.gte", date);
    } else {
      params.set("primary_release_date.gte", date);
    }
  }
  if (filters.voteAverageGte > 0) {
    params.set("vote_average.gte", String(filters.voteAverageGte));
  }
  if (filters.genreIds.length > 0) {
    params.set("with_genres", filters.genreIds.join("|"));
  }
  if (filters.providerIds.length > 0) {
    params.set("with_watch_providers", filters.providerIds.join("|"));
    params.set("watch_region", region);
  }
  return params.toString();
}

export const getStaticProps: GetStaticProps = async () => ({
  props: {},
  revalidate: 3600,
});

export default function DiscoverPage() {
  const { user } = useAuth();
  const { region, loading: regionLoading } = useRegion();
  const [genres, setGenres] = useState<TMDBGenre[]>([]);
  const [providers, setProviders] = useState<TMDBWatchProvider[]>([]);
  const [tvGenres, setTvGenres] = useState<TMDBGenre[]>([]);
  const [tvProviders, setTvProviders] = useState<TMDBWatchProvider[]>([]);
  const [filtersMetaLoading, setFiltersMetaLoading] = useState(true);

  const [mediaType, setMediaType] = useState<DiscoverMediaType>("movie");
  const [queue, setQueue] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [noResults, setNoResults] = useState(false);
  const [filters, setFilters] = useState<DiscoverFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [likeBurst, setLikeBurst] = useState(false);

  const seenIds = useRef(new Set<number>());
  const fetchingRef = useRef(false);
  const filtersRef = useRef(filters);
  const mediaTypeRef = useRef(mediaType);
  const cardRef = useRef<HTMLDivElement>(null);
  const throwingRef = useRef(false);
  const throwTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dragState = useRef({ active: false, startX: 0, startY: 0, dx: 0 });

  const hydratedRef = useRef(false);

  filtersRef.current = filters;
  mediaTypeRef.current = mediaType;

  const { isLiked, toggleLike } = useLikes();
  const regionRef = useRef(region);
  regionRef.current = region;

  useEffect(() => {
    if (regionLoading) return;
    let cancelled = false;
    setFiltersMetaLoading(true);
    fetch(`/api/discover-meta?region=${encodeURIComponent(region)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setGenres(data.genres ?? []);
        setProviders(data.providers ?? []);
        setTvGenres(data.tvGenres ?? []);
        setTvProviders(data.tvProviders ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFiltersMetaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [region, regionLoading]);

  const fetchBatch = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setNoResults(false);
    try {
      const qs = buildFilterParams(
        mediaTypeRef.current,
        filtersRef.current,
        regionRef.current,
      );
      const url = `/api/discover?${qs}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const results: DiscoverItem[] = await res.json();
      const fresh = results.filter((m) => !seenIds.current.has(m.id));
      if (fresh.length === 0) {
        setNoResults(true);
      } else {
        setQueue((prev) => [...prev, ...fresh]);
      }
    } catch {
      // will retry on next queue check
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedFilters = loadFilters();
    const savedType = loadMediaType();
    if (savedType && savedType !== mediaTypeRef.current) {
      mediaTypeRef.current = savedType;
      setMediaType(savedType);
    }
    if (savedFilters) {
      filtersRef.current = savedFilters;
      setFilters(savedFilters);
    }
    hydratedRef.current = true;
    seenIds.current.clear();
    setQueue([]);
    setLoading(true);
    fetchingRef.current = false;
    fetchBatch();
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(filters));
    } catch {}
  }, [filters]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY_MEDIA_TYPE, mediaType);
    } catch {}
  }, [mediaType]);

  const switchMediaType = useCallback(
    (next: DiscoverMediaType) => {
      if (next === mediaTypeRef.current) return;

      setFilters(DEFAULT_FILTERS);
      mediaTypeRef.current = next;
      setMediaType(next);
      seenIds.current.clear();
      setQueue([]);
      setNoResults(false);
      setLoading(true);
      fetchingRef.current = false;
      fetchBatch();
    },
    [fetchBatch],
  );

  useEffect(() => {
    if (queue.length < 5 && !noResults) fetchBatch();
  }, [queue.length, fetchBatch, noResults]);

  useEffect(() => {
    for (const movie of queue.slice(1, 4)) {
      if (movie.poster_path) {
        const img = new window.Image();
        img.src = posterUrl(movie.poster_path, "w500");
      }
    }
  }, [queue]);

  const applyFilters = useCallback(
    (newFilters: DiscoverFilters) => {
      filtersRef.current = newFilters;
      setFilters(newFilters);
      seenIds.current.clear();
      setQueue([]);
      setNoResults(false);
      setLoading(true);
      fetchingRef.current = false;
      fetchBatch();
    },
    [fetchBatch],
  );

  const advanceQueue = useCallback(() => {
    if (!throwingRef.current) return;
    clearTimeout(throwTimerRef.current);
    throwingRef.current = false;
    setQueue((prev) => {
      if (prev.length > 0) seenIds.current.add(prev[0].id);
      return prev.slice(1);
    });
  }, []);

  const throwCard = useCallback(
    (direction: "left" | "right") => {
      if (throwingRef.current || !queue[0]) return;
      throwingRef.current = true;
      const item = queue[0];

      if (direction === "right") {
        setLikeBurst(true);
        setTimeout(() => setLikeBurst(false), 500);
        const mediaType = mediaTypeRef.current;
        if (!isLiked(mediaType, item.id)) {
          toggleLike({
            mediaType,
            mediaId: item.id,
            title: isMovie(item) ? item.title : item.name,
            poster_path: item.poster_path,
          });
        }
      }

      const card = cardRef.current;
      if (!card) {
        advanceQueue();
        return;
      }

      const throwX =
        direction === "right"
          ? window.innerWidth * 1.5
          : -window.innerWidth * 1.5;
      const rotation = direction === "right" ? 25 : -25;

      card.style.transition = "none";
      void card.offsetHeight;

      card.style.transition = "transform 0.45s ease-out";
      card.style.transform = `translateX(${throwX}px) rotate(${rotation}deg)`;

      throwTimerRef.current = setTimeout(advanceQueue, 400);
    },
    [queue, isLiked, toggleLike, advanceQueue],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (throwingRef.current) return;
    const card = cardRef.current;
    if (!card) return;
    if ((e.target as HTMLElement).closest("a")) return;

    e.preventDefault();
    card.setPointerCapture(e.pointerId);
    dragState.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
    };
    card.style.transition = "none";
    card.style.cursor = "grabbing";
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const ds = dragState.current;
    if (!ds.active) return;
    ds.dx = e.clientX - ds.startX;

    const card = cardRef.current;
    if (!card) return;

    const rotation = ds.dx * 0.06;
    const lift = -Math.abs(ds.dx) * 0.04;
    card.style.transform = `translateX(${ds.dx}px) translateY(${lift}px) rotate(${rotation}deg)`;

  }, []);

  const springBack = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = "transform 0.35s cubic-bezier(0.25,0.8,0.25,1)";
    card.style.transform = "";
    card.style.cursor = "";
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const ds = dragState.current;
      if (!ds.active) return;
      ds.active = false;

      const card = cardRef.current;
      if (card) {
        card.releasePointerCapture(e.pointerId);
        card.style.cursor = "";
      }

      if (Math.abs(ds.dx) >= SWIPE_THRESHOLD) {
        throwCard(ds.dx > 0 ? "right" : "left");
      } else {
        springBack();
      }
    },
    [throwCard, springBack],
  );

  const onPointerCancel = useCallback(() => {
    const ds = dragState.current;
    if (!ds.active) return;
    ds.active = false;
    springBack();
  }, [springBack]);

  const onTransitionEnd = useCallback(
    (e: React.TransitionEvent) => {
      if (e.propertyName === "transform" && throwingRef.current) {
        advanceQueue();
      }
    },
    [advanceQueue],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (filtersOpen) return;
      if (e.key === "ArrowLeft") throwCard("left");
      if (e.key === "ArrowRight") throwCard("right");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [throwCard, filtersOpen]);

  useEffect(() => {
    return () => clearTimeout(throwTimerRef.current);
  }, []);

  const currentItem = queue[0];
  const filterCount = activeFilterCount(filters);
  const displayGenres = mediaType === "movie" ? genres : tvGenres;
  const displayProviders = mediaType === "movie" ? providers : tvProviders;

  return (
    <Layout>
      <Head>
        <title>Discover — JustPickAMovie</title>
      </Head>

      <div className="flex flex-col items-center h-[100dvh] px-4 pt-20 pb-6 overflow-hidden">
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <button
            onClick={() => setFiltersOpen(true)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filterCount > 0
                ? "bg-accent/15 text-accent border border-accent/30"
                : "bg-bg-card border border-border text-text-secondary hover:text-white hover:border-white/20"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
              />
            </svg>
            Filters
            {filterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                {filterCount}
              </span>
            )}
          </button>
        </div>
        <span className="mt-4 text-xs text-text-muted text-center leading-relaxed flex-shrink-0">
          Swipe right to like, left to skip
          <span className="hidden md:inline"> &middot; Use ← → arrow keys</span>
        </span>

        {!user && (
          <p className="text-text-muted text-sm mb-4 text-center">
            <Link
              href="/auth"
              className="text-accent hover:text-accent-hover transition-colors"
            >
              Sign in
            </Link>{" "}
            to like movies and build your list
          </p>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20">
            <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-text-muted text-sm mt-4">
              Finding {mediaType === "movie" ? "movies" : "shows"} for you...
            </p>
          </div>
        ) : noResults && queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20">
            <svg
              className="w-16 h-16 text-text-muted mb-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
              />
            </svg>
            <p className="text-text-secondary text-lg font-medium mb-1">
              No {mediaType === "movie" ? "movies" : "shows"} found
            </p>
            <p className="text-text-muted text-sm mb-4 text-center max-w-xs">
              Try adjusting your filters for more results
            </p>
            <button
              onClick={() => setFiltersOpen(true)}
              className="px-5 py-2 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors text-sm"
            >
              Edit Filters
            </button>
          </div>
        ) : queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-text-secondary text-sm mt-4">
              Loading more {mediaType === "movie" ? "movies" : "shows"}...
            </p>
          </div>
        ) : (
          <>
            {/* Card stack */}
            <div className="flex-1 flex items-center justify-center min-h-0">
              <div className="relative w-[78vw] max-w-[640px] aspect-[2/3] max-h-full select-none">
                {queue.slice(0, 3).map((item, index) => {
                  const isTop = index === 0;
                  const genreMap =
                    mediaType === "movie" ? MOVIE_GENRE_MAP : TV_GENRE_MAP;
                  const itemGenres = item.genre_ids
                    .slice(0, 2)
                    .map((id) => genreMap[id])
                    .filter(Boolean);
                  const title = isMovie(item) ? item.title : item.name;
                  const year = isMovie(item)
                    ? item.release_date?.split("-")[0]
                    : item.first_air_date?.split("-")[0];
                  const rating = item.vote_average?.toFixed(1);
                  const href = isMovie(item) ? movieHref(item) : tvHref(item);

                  return (
                    <div
                      key={item.id}
                      ref={isTop ? cardRef : undefined}
                      className="absolute inset-0 rounded-2xl overflow-hidden bg-bg-card ring-1 ring-white/10"
                      style={{
                        zIndex: 10 - index,
                        transform: isTop
                          ? undefined
                          : `scale(${1 - index * 0.04}) translateY(${index * 10}px)`,
                        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
                        touchAction: isTop ? "none" : undefined,
                        willChange: isTop ? "transform" : undefined,
                        cursor: isTop ? "grab" : undefined,
                        pointerEvents: isTop ? undefined : "none",
                        boxShadow: isTop
                          ? "0 25px 50px -12px rgba(0,0,0,0.6)"
                          : "0 10px 30px -10px rgba(0,0,0,0.4)",
                      }}
                      onPointerDown={isTop ? onPointerDown : undefined}
                      onPointerMove={isTop ? onPointerMove : undefined}
                      onPointerUp={isTop ? onPointerUp : undefined}
                      onPointerCancel={isTop ? onPointerCancel : undefined}
                      onTransitionEnd={isTop ? onTransitionEnd : undefined}
                    >
                      <Image
                        src={posterUrl(item.poster_path, "w500")}
                        alt={title}
                        fill
                        sizes="(max-width: 768px) 78vw, 340px"
                        className="object-cover pointer-events-none"
                        priority={index === 0}
                        draggable={false}
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent pointer-events-none" />

                      {/* Info overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-none">
                        {itemGenres.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {itemGenres.map((g) => (
                              <span
                                key={g}
                                className="px-2 py-0.5 rounded-full bg-white/15 text-white/80 text-xs font-medium backdrop-blur-sm"
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        )}
                        <h2 className="text-xl font-bold text-white leading-tight">
                          {title}
                        </h2>
                        <div className="flex items-center gap-3 mt-1 text-sm text-white/70">
                          {year && <span>{year}</span>}
                          {rating && rating !== "0.0" && (
                            <span className="flex items-center gap-1">
                              <svg
                                className="w-3.5 h-3.5 text-yellow-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {rating}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-white/60 line-clamp-2 leading-relaxed">
                          {item.overview}
                        </p>
                        <Link
                          href={href}
                          className="inline-flex items-center gap-1 mt-2 text-xs text-accent font-semibold hover:text-accent-hover transition-colors pointer-events-auto"
                        >
                          View Details
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-5 py-3 flex-shrink-0">
              <button
                onClick={() => throwCard("left")}
                className="w-16 h-16 rounded-full bg-bg-card border-2 border-gray-400/30 flex items-center justify-center text-gray-400 hover:bg-gray-400/10 hover:border-gray-400/60 hover:scale-110 active:scale-90 transition-all shadow-lg"
                aria-label="Skip"
              >
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {currentItem && (
                <Link
                  href={
                    isMovie(currentItem)
                      ? movieHref(currentItem)
                      : tvHref(currentItem)
                  }
                  className="w-12 h-12 rounded-full bg-bg-card border-2 border-blue-400/30 flex items-center justify-center text-blue-400 hover:bg-blue-400/10 hover:border-blue-400/60 hover:scale-110 active:scale-90 transition-all shadow-lg"
                  aria-label="View movie details"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </Link>
              )}

              <button
                onClick={() => throwCard("right")}
                className="relative w-16 h-16 rounded-full bg-bg-card border-2 border-red-400/30 flex items-center justify-center text-red-400 hover:bg-red-400/10 hover:border-red-400/60 hover:scale-110 active:scale-90 transition-all shadow-lg overflow-visible"
                aria-label="Like"
              >
                {/* Explosion particles */}
                {likeBurst &&
                  [
                    { tx: "-32px", ty: "0" },
                    { tx: "32px", ty: "0" },
                    { tx: "0", ty: "-32px" },
                    { tx: "0", ty: "32px" },
                    { tx: "-22px", ty: "-22px" },
                    { tx: "22px", ty: "-22px" },
                    { tx: "-22px", ty: "22px" },
                    { tx: "22px", ty: "22px" },
                  ].map((p, i) => (
                    <span
                      key={i}
                      className="absolute left-1/2 top-1/2 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 pointer-events-none"
                      style={
                        {
                          "--tx": p.tx,
                          "--ty": p.ty,
                          animation:
                            "like-burst-particle 0.5s ease-out forwards",
                        } as React.CSSProperties
                      }
                    />
                  ))}
                <svg
                  className={`w-7 h-7 transition-colors duration-75 ${
                    likeBurst
                      ? "fill-red-500 text-red-500 animate-[like-heart-pop_0.5s_ease-out]"
                      : "fill-none stroke-current"
                  }`}
                  fill={likeBurst ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      <DiscoverFiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={applyFilters}
        current={filters}
        genres={displayGenres}
        providers={displayProviders}
        mediaType={mediaType}
        onMediaTypeChange={switchMediaType}
        filtersLoading={filtersMetaLoading}
      />
    </Layout>
  );
}
