import { useState, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import type {
  GetStaticPaths,
  GetStaticProps,
  InferGetStaticPropsType,
} from "next";
import {
  getMovieDetails,
  parseMovieIdFromSlug,
  movieSlug,
  posterUrl,
  backdropUrl,
  profileUrl,
  movieToMediaItem,
  personHref,
  type TMDBMovieDetails,
} from "@/lib/tmdb";
import Link from "next/link";
import Layout from "@/components/Layout";
import CarouselSection from "@/components/CarouselSection";
import ReviewSection from "@/components/ReviewSection";
import LikeButton from "@/components/LikeButton";
import WatchlistButton from "@/components/WatchlistButton";
import TitleWatchProviders from "@/components/TitleWatchProviders";

interface MoviePageProps {
  movie: TMDBMovieDetails;
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: [],
  fallback: "blocking",
});

export const getStaticProps: GetStaticProps<MoviePageProps> = async ({
  params,
}) => {
  const slug = params?.slug as string;
  const movieId = parseMovieIdFromSlug(slug);

  if (!movieId) {
    return { notFound: true };
  }

  try {
    const movie = await getMovieDetails(movieId);

    const canonicalSlug = movieSlug(movie);
    if (slug !== canonicalSlug) {
      return {
        redirect: {
          destination: `/movie/${canonicalSlug}`,
          permanent: true,
        },
      };
    }

    return { props: { movie }, revalidate: 86_400 };
  } catch {
    return { notFound: true };
  }
};

function formatRuntime(minutes: number | null) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatCurrency(amount: number) {
  if (!amount) return null;
  return `$${(amount / 1_000_000).toFixed(1)}M`;
}

export default function MoviePage({
  movie,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const bgUrl = backdropUrl(movie.backdrop_path, "original");
  const year = movie.release_date?.split("-")[0] ?? "";
  const rating = movie.vote_average?.toFixed(1);
  const director = movie.credits?.crew?.find((c) => c.job === "Director");
  const cast = movie.credits?.cast?.slice(0, 12) ?? [];
  const trailer = movie.videos?.results?.find(
    (v) =>
      v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"),
  );
  const similar = (movie.similar?.results ?? [])
    .slice(0, 15)
    .map(movieToMediaItem);

  const [trailerOpen, setTrailerOpen] = useState(false);

  useEffect(() => {
    if (trailerOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [trailerOpen]);

  useEffect(() => {
    if (!trailerOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setTrailerOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [trailerOpen]);

  return (
    <Layout>
      <Head>
        <title>{movie.title} — JustPickAMovie</title>
        <meta name="description" content={movie.overview} />
        <meta property="og:title" content={movie.title} />
        <meta property="og:description" content={movie.overview} />
        {movie.backdrop_path && (
          <meta
            property="og:image"
            content={backdropUrl(movie.backdrop_path, "w1280") ?? ""}
          />
        )}
      </Head>

      {/* Backdrop hero */}
      <section className="relative w-full h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden">
        {bgUrl ? (
          <Image
            src={bgUrl}
            alt={movie.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-bg-secondary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/70 to-bg-primary/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-primary/90 via-bg-primary/40 to-transparent" />
      </section>

      {/* Main content */}
      <div className="relative z-10 -mt-48 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="flex-shrink-0 w-[220px] md:w-[280px] mx-auto md:mx-0">
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              <Image
                src={posterUrl(movie.poster_path, "w500")}
                alt={movie.title}
                fill
                sizes="280px"
                className="object-cover"
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-2 md:pt-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              {movie.title}
            </h1>

            {movie.tagline && (
              <p className="mt-2 text-lg text-text-secondary italic">
                &ldquo;{movie.tagline}&rdquo;
              </p>
            )}

            {/* Meta pills */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {rating && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-400/10 text-yellow-400 text-sm font-semibold">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {rating}
                  <span className="text-text-muted font-normal ml-1">
                    ({movie.vote_count.toLocaleString()})
                  </span>
                </span>
              )}
              {year && (
                <span className="px-3 py-1 rounded-full bg-white/5 text-text-secondary text-sm">
                  {year}
                </span>
              )}
              {formatRuntime(movie.runtime) && (
                <span className="px-3 py-1 rounded-full bg-white/5 text-text-secondary text-sm">
                  {formatRuntime(movie.runtime)}
                </span>
              )}
              {movie.status !== "Released" && (
                <span className="px-3 py-1 rounded-full bg-accent/20 text-accent text-sm font-medium">
                  {movie.status}
                </span>
              )}
            </div>

            {/* Genres */}
            {movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {movie.genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-3 py-1 rounded-full border border-border text-text-secondary text-sm hover:bg-bg-hover transition-colors"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            <p className="mt-6 text-base md:text-lg text-text-primary/90 leading-relaxed max-w-3xl">
              {movie.overview}
            </p>

            {/* Quick facts */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 mt-6 text-sm">
              {director && (
                <div>
                  <span className="text-text-muted">Director</span>
                  <p className="text-text-primary font-medium">
                    {director.name}
                  </p>
                </div>
              )}
              {formatCurrency(movie.budget) && (
                <div>
                  <span className="text-text-muted">Budget</span>
                  <p className="text-text-primary font-medium">
                    {formatCurrency(movie.budget)}
                  </p>
                </div>
              )}
              {formatCurrency(movie.revenue) && (
                <div>
                  <span className="text-text-muted">Revenue</span>
                  <p className="text-text-primary font-medium">
                    {formatCurrency(movie.revenue)}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6">
              {trailer && (
                <button
                  onClick={() => setTrailerOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-colors shadow-lg shadow-accent/20 whitespace-nowrap"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Watch Trailer
                </button>
              )}
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <LikeButton
                  mediaType="movie"
                  mediaId={movie.id}
                  title={movie.title}
                  poster_path={movie.poster_path}
                  size="lg"
                />
              </div>
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <WatchlistButton
                  mediaType="movie"
                  mediaId={movie.id}
                  title={movie.title}
                  poster_path={movie.poster_path}
                  size="lg"
                  showLabel
                />
              </div>
            </div>
          </div>
        </div>

        {/* Where to watch */}
        <TitleWatchProviders
          mediaType="movie"
          mediaId={movie.id}
          title={movie.title}
        />

        {/* Cast */}
        {cast.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl md:text-2xl font-bold text-text-primary mb-6">
              Cast
            </h2>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
              {cast.map((member) => (
                <Link
                  key={member.id}
                  href={personHref(member)}
                  className="flex-shrink-0 w-[120px] text-center group"
                >
                  <div className="relative w-[120px] h-[120px] rounded-full overflow-hidden bg-bg-card mx-auto ring-2 ring-transparent group-hover:ring-accent/50 transition-all">
                    {profileUrl(member.profile_path) ? (
                      <Image
                        src={profileUrl(member.profile_path, "w185")!}
                        alt={member.name}
                        fill
                        sizes="120px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted text-3xl font-bold">
                        {member.name[0]}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-text-primary truncate group-hover:text-accent transition-colors">
                    {member.name}
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    {member.character}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Reviews */}
        <ReviewSection
          reviews={movie.reviews?.results ?? []}
          totalResults={movie.reviews?.total_results ?? 0}
        />

        {/* Similar movies */}
        {similar.length > 0 && (
          <CarouselSection title="Similar Movies" items={similar} />
        )}
      </div>

      {/* Trailer modal */}
      {trailer && trailerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setTrailerOpen(false)}
          />
          <div className="relative w-full max-w-4xl mx-4">
            <button
              onClick={() => setTrailerOpen(false)}
              className="absolute -top-10 right-0 p-1.5 rounded-lg text-white/70 hover:text-white transition-colors"
              aria-label="Close trailer"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`}
                title={`${movie.title} Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
