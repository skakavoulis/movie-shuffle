import { useState, useRef, useCallback, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import Layout from "@/components/Layout";
import { posterUrl, movieHref, type TMDBMovie } from "@/lib/tmdb";
import { useWatchlist } from "@/context/WatchlistContext";

interface DiscoverProps {
  user: User | null;
}

const SWIPE_THRESHOLD = 80;

const GENRE_MAP: Record<number, string> = {
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

export const getServerSideProps: GetServerSideProps<DiscoverProps> = async (
  context,
) => {
  const supabase = createServerSupabaseClient(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { props: { user } };
};

export default function DiscoverPage({
  user,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [queue, setQueue] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);

  const seenIds = useRef(new Set<number>());
  const fetchingRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const throwingRef = useRef(false);
  const throwTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dragState = useRef({ active: false, startX: 0, startY: 0, dx: 0 });

  const { setWatchlistStatus } = useWatchlist();

  const fetchBatch = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch("/api/discover");
      if (!res.ok) return;
      const movies: TMDBMovie[] = await res.json();
      const fresh = movies.filter((m) => !seenIds.current.has(m.id));
      setQueue((prev) => [...prev, ...fresh]);
    } catch {
      // will retry on next queue check
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchBatch().finally(() => setLoading(false));
  }, [fetchBatch]);

  useEffect(() => {
    if (queue.length < 5) fetchBatch();
  }, [queue.length, fetchBatch]);

  useEffect(() => {
    for (const movie of queue.slice(1, 4)) {
      if (movie.poster_path) {
        const img = new window.Image();
        img.src = posterUrl(movie.poster_path, "w500");
      }
    }
  }, [queue]);

  const advanceQueue = useCallback(() => {
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

      if (direction === "right") {
        const movie = queue[0];
        setWatchlistStatus({
          mediaType: "movie",
          mediaId: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          status: "want_to_watch",
        });
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

      const likeStamp = card.querySelector(
        '[data-stamp="like"]',
      ) as HTMLElement | null;
      const skipStamp = card.querySelector(
        '[data-stamp="skip"]',
      ) as HTMLElement | null;
      if (likeStamp)
        likeStamp.style.opacity = direction === "right" ? "1" : "0";
      if (skipStamp) skipStamp.style.opacity = direction === "left" ? "1" : "0";

      throwTimerRef.current = setTimeout(advanceQueue, 500);
    },
    [queue, setWatchlistStatus, advanceQueue],
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

    const progress = Math.min(Math.abs(ds.dx) / SWIPE_THRESHOLD, 1);
    const likeStamp = card.querySelector(
      '[data-stamp="like"]',
    ) as HTMLElement | null;
    const skipStamp = card.querySelector(
      '[data-stamp="skip"]',
    ) as HTMLElement | null;
    if (likeStamp)
      likeStamp.style.opacity = ds.dx > 15 ? String(progress) : "0";
    if (skipStamp)
      skipStamp.style.opacity = ds.dx < -15 ? String(progress) : "0";
  }, []);

  const springBack = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = "transform 0.35s cubic-bezier(0.25,0.8,0.25,1)";
    card.style.transform = "";
    card.style.cursor = "";
    const likeStamp = card.querySelector(
      '[data-stamp="like"]',
    ) as HTMLElement | null;
    const skipStamp = card.querySelector(
      '[data-stamp="skip"]',
    ) as HTMLElement | null;
    if (likeStamp) likeStamp.style.opacity = "0";
    if (skipStamp) skipStamp.style.opacity = "0";
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
      if (e.key === "ArrowLeft") throwCard("left");
      if (e.key === "ArrowRight") throwCard("right");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [throwCard]);

  useEffect(() => {
    return () => clearTimeout(throwTimerRef.current);
  }, []);

  const currentMovie = queue[0];

  return (
    <Layout user={user}>
      <Head>
        <title>Discover — MovieShuffle</title>
      </Head>

      <div className="flex flex-col items-center min-h-[100dvh] px-4 pt-20 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
            Discover
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-accent/15 text-accent text-xs font-semibold tracking-wide uppercase">
            Swipe
          </span>
        </div>

        {!user && (
          <p className="text-text-muted text-sm mb-4 text-center">
            <Link
              href="/auth"
              className="text-accent hover:text-accent-hover transition-colors"
            >
              Sign in
            </Link>{" "}
            to save movies to your watchlist
          </p>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20">
            <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-text-muted text-sm mt-4">
              Finding movies for you...
            </p>
          </div>
        ) : queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-text-secondary text-sm mt-4">
              Loading more movies...
            </p>
          </div>
        ) : (
          <>
            {/* Card stack */}
            <div className="relative w-[78vw] max-w-[640px] aspect-[2/3] select-none flex-shrink-0">
              {queue.slice(0, 3).map((movie, index) => {
                const isTop = index === 0;
                const genres = movie.genre_ids
                  .slice(0, 2)
                  .map((id) => GENRE_MAP[id])
                  .filter(Boolean);
                const year = movie.release_date?.split("-")[0];
                const rating = movie.vote_average?.toFixed(1);

                return (
                  <div
                    key={movie.id}
                    ref={isTop ? cardRef : undefined}
                    className="absolute inset-0 rounded-2xl overflow-hidden bg-bg-card ring-1 ring-white/10"
                    style={{
                      zIndex: 10 - index,
                      transform: isTop
                        ? undefined
                        : `scale(${1 - index * 0.04}) translateY(${index * 10}px)`,
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
                      src={posterUrl(movie.poster_path, "w500")}
                      alt={movie.title}
                      fill
                      sizes="(max-width: 768px) 78vw, 340px"
                      className="object-cover pointer-events-none"
                      priority={index === 0}
                      draggable={false}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent pointer-events-none" />

                    {/* LIKE stamp */}
                    <div
                      data-stamp="like"
                      className="absolute top-6 left-4 border-[3px] border-green-400 text-green-400 text-xl font-black px-3 py-1.5 rounded-lg -rotate-12 pointer-events-none uppercase tracking-wider"
                      style={{ opacity: 0, transition: "opacity 0.1s" }}
                    >
                      Watchlist
                    </div>

                    {/* SKIP stamp */}
                    <div
                      data-stamp="skip"
                      className="absolute top-6 right-4 border-[3px] border-red-400 text-red-400 text-xl font-black px-3 py-1.5 rounded-lg rotate-12 pointer-events-none uppercase tracking-wider"
                      style={{ opacity: 0, transition: "opacity 0.1s" }}
                    >
                      Skip
                    </div>

                    {/* Movie info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-none">
                      {genres.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {genres.map((g) => (
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
                        {movie.title}
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
                        {movie.overview}
                      </p>
                      <Link
                        href={movieHref(movie)}
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

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-5 mt-7 flex-shrink-0">
              <button
                onClick={() => throwCard("left")}
                className="w-16 h-16 rounded-full bg-bg-card border-2 border-red-400/30 flex items-center justify-center text-red-400 hover:bg-red-400/10 hover:border-red-400/60 hover:scale-110 active:scale-90 transition-all shadow-lg"
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

              {currentMovie && (
                <Link
                  href={movieHref(currentMovie)}
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
                className="w-16 h-16 rounded-full bg-bg-card border-2 border-green-400/30 flex items-center justify-center text-green-400 hover:bg-green-400/10 hover:border-green-400/60 hover:scale-110 active:scale-90 transition-all shadow-lg"
                aria-label="Add to watchlist"
              >
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </button>
            </div>

            <p className="mt-4 text-xs text-text-muted text-center leading-relaxed flex-shrink-0">
              Swipe right to add to watchlist, left to skip
              <span className="hidden md:inline">
                {" "}
                &middot; Use ← → arrow keys
              </span>
            </p>
          </>
        )}
      </div>
    </Layout>
  );
}
