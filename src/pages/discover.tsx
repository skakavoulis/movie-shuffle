import { useState, useRef, useCallback, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import type { GetStaticProps } from "next";
import Layout from "@/components/Layout";
import {
  posterUrl,
  movieHref,
  tvHref,
  type TMDBGenre,
  type TMDBWatchProvider,
} from "@/lib/tmdb";
import { useLikes } from "@/context/LikesContext";
import { useWatchlist } from "@/context/WatchlistContext";
import { useAuth } from "@/context/AuthContext";
import DiscoverFiltersModal, {
  DEFAULT_FILTERS,
  activeFilterCount,
  type DiscoverFilters,
} from "@/components/DiscoverFiltersModal";
import { useRegion } from "@/context/RegionContext";
import {
  DiscoverCard,
  ActionButtons,
  LoadingSpinner,
  NoResults,
  LoadingMore,
  FiltersIcon,
  isMovie,
  type DiscoverItem,
  type DiscoverMediaType,
} from "@/components/discover";

// ─── Session-seen tracking ───────────────────────────────────────────

const SESSION_SEEN_KEY = "discover-seen";

function loadSessionSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function addSessionSeen(
  set: Set<string>,
  mediaType: DiscoverMediaType,
  id: number,
) {
  const key = `${mediaType}:${id}`;
  set.add(key);
  try {
    sessionStorage.setItem(SESSION_SEEN_KEY, JSON.stringify([...set]));
  } catch {}
}

function hasSessionSeen(
  set: Set<string>,
  mediaType: DiscoverMediaType,
  id: number,
) {
  return set.has(`${mediaType}:${id}`);
}

function filterUnseen(
  items: DiscoverItem[],
  mediaType: DiscoverMediaType,
  sessionSeen: Set<string>,
  isLiked: (mt: DiscoverMediaType, id: number) => boolean,
  getWatchlistStatus: (mt: DiscoverMediaType, id: number) => string | null,
): DiscoverItem[] {
  return items.filter(
    (m) =>
      !hasSessionSeen(sessionSeen, mediaType, m.id) &&
      !isLiked(mediaType, m.id) &&
      !getWatchlistStatus(mediaType, m.id),
  );
}

// ─── LocalStorage persistence ────────────────────────────────────────

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

// ─── API helpers ─────────────────────────────────────────────────────

function buildFilterParams(
  mediaType: DiscoverMediaType,
  filters: DiscoverFilters,
  region: string,
): string {
  const params = new URLSearchParams();
  params.set("type", mediaType);

  if (filters.releaseYearGte) {
    const dateKey =
      mediaType === "tv" ? "first_air_date.gte" : "primary_release_date.gte";
    params.set(dateKey, `${filters.releaseYearGte}-01-01`);
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

// ─── Constants ───────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 80;
const TAP_THRESHOLD = 6;

// ─── Page ────────────────────────────────────────────────────────────

export const getStaticProps: GetStaticProps = async () => ({
  props: {},
  revalidate: 86_400,
});

export default function DiscoverPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { region, loading: regionLoading } = useRegion();

  // ── Filter metadata ──
  const [genres, setGenres] = useState<TMDBGenre[]>([]);
  const [providers, setProviders] = useState<TMDBWatchProvider[]>([]);
  const [tvGenres, setTvGenres] = useState<TMDBGenre[]>([]);
  const [tvProviders, setTvProviders] = useState<TMDBWatchProvider[]>([]);
  const [filtersMetaLoading, setFiltersMetaLoading] = useState(true);

  // ── Core state ──
  const [mediaType, setMediaType] = useState<DiscoverMediaType>("movie");
  const [queue, setQueue] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [noResults, setNoResults] = useState(false);
  const [filters, setFilters] = useState<DiscoverFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [likeBurst, setLikeBurst] = useState(false);

  // ── Refs ──
  const sessionSeen = useRef<Set<string>>(new Set());
  const sessionSeenLoaded = useRef(false);
  const nextPageRef = useRef(1);
  const exhaustedRef = useRef(false);
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
  const { getStatus: getWatchlistStatus } = useWatchlist();
  const isLikedRef = useRef(isLiked);
  isLikedRef.current = isLiked;
  const getWatchlistStatusRef = useRef(getWatchlistStatus);
  getWatchlistStatusRef.current = getWatchlistStatus;
  const regionRef = useRef(region);
  regionRef.current = region;

  // ── Data fetching ──

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
    if (fetchingRef.current || exhaustedRef.current) return;
    fetchingRef.current = true;
    setNoResults(false);

    try {
      const qs = buildFilterParams(
        mediaTypeRef.current,
        filtersRef.current,
        regionRef.current,
      );
      let fresh: DiscoverItem[] = [];

      while (fresh.length === 0) {
        const res = await fetch(
          `/api/discover?${qs}&page=${nextPageRef.current}`,
        );
        if (!res.ok) return;

        const data: { results: DiscoverItem[]; nextPage: number | null } =
          await res.json();

        if (data.nextPage != null) {
          nextPageRef.current = data.nextPage;
        } else {
          exhaustedRef.current = true;
        }

        fresh = filterUnseen(
          data.results,
          mediaTypeRef.current,
          sessionSeen.current,
          isLikedRef.current,
          getWatchlistStatusRef.current,
        );

        if (exhaustedRef.current) break;
      }

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

  const resetAndFetch = useCallback(
    (nextFilters?: DiscoverFilters, nextMediaType?: DiscoverMediaType) => {
      if (nextFilters) {
        filtersRef.current = nextFilters;
        setFilters(nextFilters);
      }
      if (nextMediaType) {
        mediaTypeRef.current = nextMediaType;
        setMediaType(nextMediaType);
      }
      nextPageRef.current = 1;
      exhaustedRef.current = false;
      fetchingRef.current = false;
      setQueue([]);
      setNoResults(false);
      setLoading(true);
      fetchBatch();
    },
    [fetchBatch],
  );

  // Hydrate persisted state on mount
  useEffect(() => {
    const savedType = loadMediaType();
    const savedFilters = loadFilters();
    if (savedType && savedType !== mediaTypeRef.current) {
      mediaTypeRef.current = savedType;
      setMediaType(savedType);
    }
    if (savedFilters) {
      filtersRef.current = savedFilters;
      setFilters(savedFilters);
    }
    hydratedRef.current = true;

    if (!sessionSeenLoaded.current) {
      sessionSeen.current = loadSessionSeen();
      sessionSeenLoaded.current = true;
    }

    resetAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist filters & media type
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

  // Auto-fetch when queue runs low
  useEffect(() => {
    if (queue.length < 5 && !noResults && !exhaustedRef.current) fetchBatch();
  }, [queue.length, fetchBatch, noResults]);

  // Preload next poster images
  useEffect(() => {
    for (const item of queue.slice(1, 4)) {
      if (item.poster_path) {
        const img = new window.Image();
        img.src = posterUrl(item.poster_path, "w500");
      }
    }
  }, [queue]);

  // ── User actions ──

  const switchMediaType = useCallback(
    (next: DiscoverMediaType) => {
      if (next === mediaTypeRef.current) return;
      resetAndFetch(DEFAULT_FILTERS, next);
    },
    [resetAndFetch],
  );

  const applyFilters = useCallback(
    (newFilters: DiscoverFilters) => resetAndFetch(newFilters),
    [resetAndFetch],
  );

  const advanceQueue = useCallback(() => {
    if (!throwingRef.current) return;
    clearTimeout(throwTimerRef.current);
    throwingRef.current = false;
    setQueue((prev) => {
      if (prev.length > 0) {
        addSessionSeen(sessionSeen.current, mediaTypeRef.current, prev[0].id);
      }
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
        const mt = mediaTypeRef.current;
        if (!isLiked(mt, item.id)) {
          toggleLike({
            mediaType: mt,
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

      const throwX = (direction === "right" ? 1.5 : -1.5) * window.innerWidth;
      const rotation = direction === "right" ? 25 : -25;

      card.style.transition = "none";
      void card.offsetHeight;
      card.style.transition = "transform 0.45s ease-out";
      card.style.transform = `translateX(${throwX}px) rotate(${rotation}deg)`;

      throwTimerRef.current = setTimeout(advanceQueue, 400);
    },
    [queue, isLiked, toggleLike, advanceQueue],
  );

  // ── Pointer / drag handlers ──

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (throwingRef.current) return;
    const card = cardRef.current;
    if (!card || (e.target as HTMLElement).closest("a")) return;

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
        const dy = e.clientY - ds.startY;
        if (Math.abs(ds.dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD) {
          const top = queue[0];
          if (top) router.push(isMovie(top) ? movieHref(top) : tvHref(top));
        }
      }
    },
    [throwCard, springBack, queue, router],
  );

  const onPointerCancel = useCallback(() => {
    if (!dragState.current.active) return;
    dragState.current.active = false;
    springBack();
  }, [springBack]);

  const onTransitionEnd = useCallback(
    (e: React.TransitionEvent) => {
      if (e.propertyName === "transform" && throwingRef.current) advanceQueue();
    },
    [advanceQueue],
  );

  // ── Keyboard shortcuts ──

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

  // ── Derived values ──

  const currentItem = queue[0];
  const filterCount = activeFilterCount(filters);
  const displayGenres = mediaType === "movie" ? genres : tvGenres;
  const displayProviders = mediaType === "movie" ? providers : tvProviders;

  // ── Render ──

  return (
    <Layout>
      <Head>
        <title>Discover — JustPickAMovie</title>
      </Head>

      <div className="flex flex-col items-center h-[100dvh] px-4 pt-20 pb-6 overflow-hidden">
        <Header
          filterCount={filterCount}
          onOpenFilters={() => setFiltersOpen(true)}
        />

        {!user && <SignInPrompt />}

        {loading ? (
          <LoadingSpinner mediaType={mediaType} />
        ) : noResults && queue.length === 0 ? (
          <NoResults
            mediaType={mediaType}
            onEditFilters={() => setFiltersOpen(true)}
          />
        ) : queue.length === 0 ? (
          <LoadingMore mediaType={mediaType} />
        ) : (
          <>
            <div className="flex-1 flex items-center justify-center min-h-0">
              <div className="relative h-full w-auto aspect-[2/3] max-h-[min(100%,104vw,853px)] select-none">
                {queue.slice(0, 3).map((item, index) => (
                  <DiscoverCard
                    key={item.id}
                    item={item}
                    index={index}
                    mediaType={mediaType}
                    cardRef={cardRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerCancel}
                    onTransitionEnd={onTransitionEnd}
                  />
                ))}
              </div>
            </div>

            <ActionButtons
              currentItem={currentItem}
              likeBurst={likeBurst}
              onSkip={() => throwCard("left")}
              onLike={() => throwCard("right")}
            />
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

// ─── Small inline sub-components ─────────────────────────────────────

function Header({
  filterCount,
  onOpenFilters,
}: {
  filterCount: number;
  onOpenFilters: () => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <button
          onClick={onOpenFilters}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filterCount > 0
              ? "bg-accent/15 text-accent border border-accent/30"
              : "bg-bg-card border border-border text-text-secondary hover:text-white hover:border-white/20"
          }`}
        >
          <FiltersIcon />
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
    </>
  );
}

function SignInPrompt() {
  return (
    <p className="text-text-muted text-sm mb-4 text-center">
      <Link
        href="/auth"
        className="text-accent hover:text-accent-hover transition-colors"
      >
        Sign in
      </Link>{" "}
      to like movies and build your list
    </p>
  );
}
