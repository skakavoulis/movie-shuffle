import Head from "next/head";
import Image from "next/image";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import {
  getTVShowDetails,
  getTVShowWatchProvidersById,
  parseTVIdFromSlug,
  tvSlug,
  posterUrl,
  backdropUrl,
  profileUrl,
  tvShowToMediaItem,
  personHref,
  pickWatchRegion,
  type TMDBTVShowDetails,
  type TMDBWatchProviderOffer,
} from "@/lib/tmdb";
import Link from "next/link";
import Layout from "@/components/Layout";
import CarouselSection from "@/components/CarouselSection";
import ReviewSection from "@/components/ReviewSection";
import LikeButton from "@/components/LikeButton";
import WatchlistButton from "@/components/WatchlistButton";
import WatchProvidersSection from "@/components/WatchProvidersSection";

interface TVPageProps {
  user: User | null;
  show: TMDBTVShowDetails;
  watchOffer: TMDBWatchProviderOffer | null;
}

export const getServerSideProps: GetServerSideProps<TVPageProps> = async (
  context,
) => {
  const slug = context.params?.slug as string;
  const showId = parseTVIdFromSlug(slug);

  if (!showId) {
    return { notFound: true };
  }

  const supabase = createServerSupabaseClient(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    const [show, watchData] = await Promise.all([
      getTVShowDetails(showId),
      getTVShowWatchProvidersById(showId).catch(() => ({ results: {} })),
    ]);

    const canonicalSlug = tvSlug(show);
    if (slug !== canonicalSlug) {
      return {
        redirect: {
          destination: `/tv/${canonicalSlug}`,
          permanent: true,
        },
      };
    }

    const watchOffer = pickWatchRegion(watchData.results)?.offer ?? null;

    return { props: { user, show, watchOffer } };
  } catch {
    return { notFound: true };
  }
};

export default function TVShowPage({
  user,
  show,
  watchOffer,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const bgUrl = backdropUrl(show.backdrop_path, "original");
  const year = show.first_air_date?.split("-")[0] ?? "";
  const rating = show.vote_average?.toFixed(1);
  const creators = show.created_by ?? [];
  const cast = show.credits?.cast?.slice(0, 12) ?? [];
  const trailer = show.videos?.results?.find(
    (v) =>
      v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"),
  );
  const similar = (show.similar?.results ?? [])
    .slice(0, 15)
    .map(tvShowToMediaItem);
  const avgRuntime =
    show.episode_run_time?.length > 0
      ? Math.round(
          show.episode_run_time.reduce((a, b) => a + b, 0) /
            show.episode_run_time.length,
        )
      : null;

  return (
    <Layout user={user}>
      <Head>
        <title>{show.name} — MovieShuffle</title>
        <meta name="description" content={show.overview} />
        <meta property="og:title" content={show.name} />
        <meta property="og:description" content={show.overview} />
        {show.backdrop_path && (
          <meta
            property="og:image"
            content={backdropUrl(show.backdrop_path, "w1280") ?? ""}
          />
        )}
      </Head>

      {/* Backdrop hero */}
      <section className="relative w-full h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden">
        {bgUrl ? (
          <Image
            src={bgUrl}
            alt={show.name}
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
                src={posterUrl(show.poster_path, "w500")}
                alt={show.name}
                fill
                sizes="280px"
                className="object-cover"
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-2 md:pt-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              {show.name}
            </h1>

            {show.tagline && (
              <p className="mt-2 text-lg text-text-secondary italic">
                &ldquo;{show.tagline}&rdquo;
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
                    ({show.vote_count.toLocaleString()})
                  </span>
                </span>
              )}
              {year && (
                <span className="px-3 py-1 rounded-full bg-white/5 text-text-secondary text-sm">
                  {year}
                </span>
              )}
              <span className="px-3 py-1 rounded-full bg-white/5 text-text-secondary text-sm">
                {show.number_of_seasons}{" "}
                {show.number_of_seasons === 1 ? "Season" : "Seasons"}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 text-text-secondary text-sm">
                {show.number_of_episodes} Episodes
              </span>
              {avgRuntime && (
                <span className="px-3 py-1 rounded-full bg-white/5 text-text-secondary text-sm">
                  ~{avgRuntime}m/ep
                </span>
              )}
              {show.status !== "Ended" && show.status !== "Canceled" && (
                <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
                  {show.status}
                </span>
              )}
              {(show.status === "Ended" || show.status === "Canceled") && (
                <span className="px-3 py-1 rounded-full bg-text-muted/20 text-text-muted text-sm font-medium">
                  {show.status}
                </span>
              )}
            </div>

            {/* Genres */}
            {show.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {show.genres.map((g) => (
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
              {show.overview}
            </p>

            {/* Quick facts */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 mt-6 text-sm">
              {creators.length > 0 && (
                <div>
                  <span className="text-text-muted">
                    {creators.length === 1 ? "Creator" : "Creators"}
                  </span>
                  <p className="text-text-primary font-medium">
                    {creators.map((c) => c.name).join(", ")}
                  </p>
                </div>
              )}
              {show.networks?.length > 0 && (
                <div>
                  <span className="text-text-muted">Network</span>
                  <p className="text-text-primary font-medium">
                    {show.networks.map((n) => n.name).join(", ")}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6">
              {trailer && (
                <a
                  href={`https://www.youtube.com/watch?v=${trailer.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-colors shadow-lg shadow-accent/20"
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
                </a>
              )}
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <LikeButton
                  mediaType="tv"
                  mediaId={show.id}
                  title={show.name}
                  poster_path={show.poster_path}
                  size="lg"
                >
                  <span className="text-sm text-text-secondary font-medium">
                    Like
                  </span>
                </LikeButton>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <WatchlistButton
                  mediaType="tv"
                  mediaId={show.id}
                  title={show.name}
                  poster_path={show.poster_path}
                  size="lg"
                  showLabel
                />
              </div>
            </div>
          </div>
        </div>

        {/* Where to watch */}
        <WatchProvidersSection offer={watchOffer} />

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
          reviews={show.reviews?.results ?? []}
          totalResults={show.reviews?.total_results ?? 0}
        />

        {/* Similar shows */}
        {similar.length > 0 && (
          <CarouselSection title="Similar Shows" items={similar} />
        )}
      </div>
    </Layout>
  );
}
