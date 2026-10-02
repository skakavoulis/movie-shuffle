import Head from "next/head";
import type { GetStaticProps, InferGetStaticPropsType } from "next";
import {
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getTrendingMovies,
  sampleMovies,
  movieToMediaItem,
  backdropUrl,
  posterUrl,
  type MediaItem,
} from "@/lib/tmdb";
import { SITE_NAME, siteUrl } from "@/lib/site";
import Layout from "@/components/Layout";
import HeroBanner from "@/components/HeroBanner";
import CarouselSection from "@/components/CarouselSection";
import DiscoverCTASection from "@/components/DiscoverCTASection";
import NewsHeadlinesSection from "@/components/NewsHeadlinesSection";
import HomeAboutSection, { HOME_FAQ } from "@/components/HomeAboutSection";

const PAGE_TITLE = `Random Movie Generator — Find a Movie to Watch Tonight | ${SITE_NAME}`;
const PAGE_DESCRIPTION =
  "Can't decide what to watch? Get random movie picks from trending, top-rated and now-playing films, see where to stream them, and swipe to find your next favorite.";

interface HomeProps {
  hero: MediaItem | null;
  sections: { title: string; items: MediaItem[] }[];
  siteUrl: string;
  error: string | null;
}

function buildStructuredData(
  origin: string,
  sections: HomeProps["sections"],
) {
  const featured = sections.flatMap((s) => s.items).slice(0, 20);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        url: `${origin}/`,
        name: SITE_NAME,
        description: PAGE_DESCRIPTION,
        inLanguage: "en",
      },
      {
        "@type": "ItemList",
        name: "Random movie picks",
        itemListElement: featured.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${origin}${item.href}`,
          name: item.title,
          image: posterUrl(item.poster_path, "w342"),
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: HOME_FAQ.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  try {
    const [popular, topRated, nowPlaying, trending] = await Promise.all([
      getPopularMovies(),
      getTopRatedMovies(),
      getNowPlayingMovies(),
      getTrendingMovies(),
    ]);

    const allForHero = [...popular.results, ...trending.results].filter(
      (m) => m.backdrop_path,
    );

    const heroMovie =
      allForHero[Math.floor(Math.random() * allForHero.length)] ?? null;

    const sections = [
      {
        title: "Random Movie Picks",
        items: sampleMovies(popular.results, 15).map(movieToMediaItem),
      },
      {
        title: "Trending Movies This Week",
        items: sampleMovies(trending.results, 15).map(movieToMediaItem),
      },
      {
        title: "Top Rated Movies of All Time",
        items: sampleMovies(topRated.results, 15).map(movieToMediaItem),
      },
      {
        title: "Now Playing in Theaters",
        items: sampleMovies(nowPlaying.results, 15).map(movieToMediaItem),
      },
    ];

    return {
      props: {
        hero: heroMovie ? movieToMediaItem(heroMovie) : null,
        sections,
        siteUrl: siteUrl(),
        error: null,
      },
      revalidate: 3600,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch movies";
    return {
      props: { hero: null, sections: [], siteUrl: siteUrl(), error: message },
      revalidate: 3600,
    };
  }
};

export default function Home({
  hero,
  sections,
  siteUrl: origin,
  error,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const canonical = `${origin}/`;
  const ogImage = hero ? backdropUrl(hero.backdrop_path, "w1280") : null;

  return (
    <Layout>
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta
          name="twitter:card"
          content={ogImage ? "summary_large_image" : "summary"}
        />
        <meta name="twitter:title" content={PAGE_TITLE} />
        <meta name="twitter:description" content={PAGE_DESCRIPTION} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        {!error && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(
                buildStructuredData(origin, sections),
              ).replace(/</g, "\\u003c"),
            }}
          />
        )}
      </Head>

      {error ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 pt-20">
          <div className="bg-bg-card border border-border rounded-xl p-8 max-w-md text-center">
            <svg
              className="w-16 h-16 mx-auto text-accent mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <h2 className="text-xl font-bold text-text-primary mb-2">
              Unable to Load Movies
            </h2>
            <p className="text-text-secondary text-sm">{error}</p>
            <p className="text-text-muted text-xs mt-4">
              Make sure your TMDB API key is configured in .env.local
            </p>
          </div>
        </div>
      ) : (
        <>
          {hero ? (
            <HeroBanner
              item={hero}
              eyebrow="Random movie generator — can't decide what to watch?"
            />
          ) : (
            <h1 className="sr-only">
              Random movie generator — can&apos;t decide what to watch?
            </h1>
          )}
          <div className={`${hero ? "-mt-16" : "pt-20"} relative z-10`}>
            {sections.map((section, index) => (
              <div key={section.title}>
                <CarouselSection title={section.title} items={section.items} />
                {index === 0 && <DiscoverCTASection />}
                {index === 1 && <NewsHeadlinesSection />}
              </div>
            ))}
            <HomeAboutSection />
          </div>
        </>
      )}
    </Layout>
  );
}
