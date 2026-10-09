import { useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import type { GetStaticProps, InferGetStaticPropsType } from "next";
import {
  getPersonMovieCredits,
  movieToMediaItem,
  compactMediaItemForGrid,
  personHref,
  profileUrl,
  type MediaItem,
} from "@/lib/tmdb";
import { greatCreatorsConfig, type GreatCreator } from "@/lib/greatCreators";
import Layout from "@/components/Layout";
import CarouselSection from "@/components/CarouselSection";

interface CreatorFloor {
  id: number;
  name: string;
  profile_path: string | null;
  href: string;
  movies: MediaItem[];
}

interface GreatCreatorsProps {
  floors: CreatorFloor[];
  error: string | null;
}

async function buildFloor(creator: GreatCreator): Promise<CreatorFloor> {
  const person = await getPersonMovieCredits(creator.tmdbId);
  const { minVoteCount, moviesPerCreator } = greatCreatorsConfig;

  const directed = (person.movie_credits?.crew ?? []).filter(
    (c) => c.job === "Director" && !c.video && c.vote_count >= minVoteCount,
  );
  const movies = directed
    .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, moviesPerCreator)
    .map((c) => compactMediaItemForGrid(movieToMediaItem(c)));

  return {
    id: person.id,
    name: creator.name,
    profile_path: person.profile_path,
    href: personHref({ id: person.id, name: person.name }),
    movies,
  };
}

export const getStaticProps: GetStaticProps<GreatCreatorsProps> = async () => {
  const revalidate = greatCreatorsConfig.revalidateSeconds;
  const results = await Promise.allSettled(
    greatCreatorsConfig.creators.map(buildFloor),
  );

  // One director failing to load only drops that floor, not the whole page.
  const floors = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((f) => f.movies.length > 0);

  if (!floors.length) {
    const failed = results.find((r) => r.status === "rejected");
    const message =
      failed?.reason instanceof Error
        ? failed.reason.message
        : "Failed to fetch directors";
    return { props: { floors: [], error: message }, revalidate: 60 };
  }

  return { props: { floors, error: null }, revalidate };
};

const floorDomId = (id: number) => `creator-${id}`;

/**
 * Remembers which director was on screen when the visitor leaves, and scrolls
 * back to them on return via back/forward. The position is stored per history
 * entry, so opening the page afresh from the nav still starts at the top.
 */
function useRestoreLastCreator() {
  const router = useRouter();

  useEffect(() => {
    const storageKey = `great-creators:last:${window.history.state?.key ?? ""}`;

    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const { id, offset } = JSON.parse(saved) as {
          id: string;
          offset: number;
        };
        const floor = document.getElementById(id);
        if (floor) {
          // An absolute target, applied again on the next frame, so a smooth
          // scroll still in flight from the previous page cannot throw it off.
          const restore = () =>
            window.scrollTo({
              top: floor.getBoundingClientRect().top + window.scrollY - offset,
              behavior: "instant",
            });
          restore();
          requestAnimationFrame(restore);
        }
      }
    } catch {
      // Storage unavailable or stale entry: stay at the top.
    }

    const save = () => {
      // The floor being looked at is the last one that starts above mid-screen.
      const current = [
        ...document.querySelectorAll<HTMLElement>("[data-creator-floor]"),
      ]
        .filter((el) => el.getBoundingClientRect().top <= window.innerHeight / 2)
        .pop();
      try {
        if (current) {
          sessionStorage.setItem(
            storageKey,
            JSON.stringify({
              id: current.id,
              offset: current.getBoundingClientRect().top,
            }),
          );
        } else {
          sessionStorage.removeItem(storageKey);
        }
      } catch {
        // Ignore: restoring is a convenience only.
      }
    };

    router.events.on("routeChangeStart", save);
    return () => router.events.off("routeChangeStart", save);
  }, [router.events]);
}

export default function GreatCreators({
  floors,
  error,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const { title, intro, source } = greatCreatorsConfig;
  useRestoreLastCreator();

  return (
    <Layout>
      <Head>
        <title>{`${title} — The Greatest Film Directors and Their Best Movies | JustPickAMovie`}</title>
        <meta
          name="description"
          content="Browse the most acclaimed film directors of all time, from Hitchcock to Kurosawa, each with their best movies ranked by rating."
        />
      </Head>

      <div className="pt-28 px-6 md:px-12">
        <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary">
          {title}
        </h1>
        <p className="mt-2 text-text-secondary max-w-2xl">{intro}</p>

        {error ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="bg-bg-card border border-border rounded-xl p-8 max-w-md text-center">
              <h2 className="text-xl font-bold text-text-primary mb-2">
                Unable to Load Directors
              </h2>
              <p className="text-text-secondary text-sm">{error}</p>
              <p className="text-text-muted text-xs mt-4">
                Make sure your TMDB API key is configured in .env.local
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-8 divide-y divide-border">
              {floors.map((floor, i) => (
                <section
                  key={floor.id}
                  id={floorDomId(floor.id)}
                  data-creator-floor
                  aria-label={floor.name}
                  className="flex flex-col md:flex-row gap-4 md:gap-8 py-8"
                >
                  <Link
                    href={floor.href}
                    className="group flex md:flex-col items-center md:items-stretch gap-4 md:gap-0 flex-shrink-0 md:w-[200px]"
                  >
                    <div className="relative flex-shrink-0 w-20 md:w-full aspect-[2/3] overflow-hidden rounded-lg bg-bg-card shadow-lg ring-1 ring-white/10">
                      {profileUrl(floor.profile_path) ? (
                        <Image
                          src={profileUrl(floor.profile_path, "h632")!}
                          alt={floor.name}
                          fill
                          priority={i === 0}
                          sizes="(min-width: 768px) 200px, 80px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted text-4xl font-bold">
                          {floor.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="md:mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                        #{i + 1}
                      </p>
                      <h2 className="text-lg font-bold text-text-primary group-hover:text-white transition-colors">
                        {floor.name}
                      </h2>
                    </div>
                  </Link>

                  <div className="min-w-0 flex-1">
                    <CarouselSection items={floor.movies} className="" />
                  </div>
                </section>
              ))}
            </div>

            <p className="mt-6 text-xs text-text-muted">
              Directors ranked by{" "}
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-text-secondary"
              >
                {source.name}
              </a>
              . Films ordered by TMDB rating.
            </p>
          </>
        )}
      </div>
    </Layout>
  );
}
