import Head from "next/head";
import type { GetStaticProps, InferGetStaticPropsType } from "next";
import {
  getPopularTVShows,
  getTopRatedTVShows,
  getOnTheAirTVShows,
  getTrendingTVShows,
  sampleTVShows,
  tvShowToMediaItem,
  type MediaItem,
} from "@/lib/tmdb";
import Layout from "@/components/Layout";
import HeroBanner from "@/components/HeroBanner";
import CarouselSection from "@/components/CarouselSection";

interface TVShowsProps {
  hero: MediaItem | null;
  sections: { title: string; items: MediaItem[] }[];
  error: string | null;
}

export const getStaticProps: GetStaticProps<TVShowsProps> = async () => {
  try {
    const [popular, topRated, onTheAir, trending] = await Promise.all([
      getPopularTVShows(),
      getTopRatedTVShows(),
      getOnTheAirTVShows(),
      getTrendingTVShows(),
    ]);

    const allForHero = [
      ...popular.results,
      ...trending.results,
    ].filter((s) => s.backdrop_path);

    const heroShow =
      allForHero[Math.floor(Math.random() * allForHero.length)] ?? null;

    const sections = [
      { title: "Random Picks", items: sampleTVShows(popular.results, 15).map(tvShowToMediaItem) },
      { title: "Trending This Week", items: sampleTVShows(trending.results, 15).map(tvShowToMediaItem) },
      { title: "Top Rated", items: sampleTVShows(topRated.results, 15).map(tvShowToMediaItem) },
      { title: "On The Air", items: sampleTVShows(onTheAir.results, 15).map(tvShowToMediaItem) },
    ];

    return {
      props: {
        hero: heroShow ? tvShowToMediaItem(heroShow) : null,
        sections,
        error: null,
      },
      revalidate: 300,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch TV shows";
    return {
      props: { hero: null, sections: [], error: message },
      revalidate: 60,
    };
  }
};

export default function TVShows({
  hero,
  sections,
  error,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <Layout>
      <Head>
        <title>TV Shows — JustPickAMovie</title>
      </Head>

      {error ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 pt-20">
          <div className="bg-bg-card border border-border rounded-xl p-8 max-w-md text-center">
            <svg className="w-16 h-16 mx-auto text-accent mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-xl font-bold text-text-primary mb-2">
              Unable to Load TV Shows
            </h2>
            <p className="text-text-secondary text-sm">{error}</p>
            <p className="text-text-muted text-xs mt-4">
              Make sure your TMDB API key is configured in .env.local
            </p>
          </div>
        </div>
      ) : (
        <>
          {hero && <HeroBanner item={hero} />}
          <div className="-mt-16 relative z-10">
            {sections.map((section) => (
              <CarouselSection
                key={section.title}
                title={section.title}
                items={section.items}
              />
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}
