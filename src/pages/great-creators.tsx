import { useEffect, useRef, useState } from "react";
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
  /** e.g. "1899–1980" or "b. 1970"; empty when TMDB has no birthday. */
  lifespan: string;
  birthplace: string | null;
  bio: string;
  /** Every film they directed, not just the ones shown. */
  filmCount: number;
  /** Release years of their first and latest film, e.g. "1925–1976". */
  activeYears: string;
}

interface GreatCreatorsProps {
  floors: CreatorFloor[];
  error: string | null;
}

const BIO_MAX_LENGTH = 280;

/** Opening of the TMDB biography, cut at a sentence end where possible. */
function shortBio(biography: string): string {
  const first = biography.split(/\n+/)[0]?.trim() ?? "";
  if (first.length <= BIO_MAX_LENGTH) return first;
  const cut = first.slice(0, BIO_MAX_LENGTH);
  const sentenceEnd = cut.lastIndexOf(". ");
  return sentenceEnd > BIO_MAX_LENGTH / 2
    ? cut.slice(0, sentenceEnd + 1)
    : `${cut.replace(/\s+\S*$/, "")}…`;
}

const yearOf = (date: string | null | undefined) => date?.slice(0, 4) ?? "";

async function buildFloor(creator: GreatCreator): Promise<CreatorFloor> {
  const person = await getPersonMovieCredits(creator.tmdbId);
  const { moviesPerCreator } = greatCreatorsConfig;
  const minVoteCount = creator.minVoteCount ?? greatCreatorsConfig.minVoteCount;

  const directed = (person.movie_credits?.crew ?? [])
    .filter((c) => c.job === "Director" && !c.video)
    .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);
  const movies = directed
    .filter((c) => c.vote_count >= minVoteCount)
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, moviesPerCreator)
    .map((c) => compactMediaItemForGrid(movieToMediaItem(c)));

  // Unreleased and announced projects have no votes yet; leave them out.
  const released = directed.filter((c) => c.release_date && c.vote_count > 0);
  const years = released.map((c) => yearOf(c.release_date)).sort();
  const born = yearOf(person.birthday);
  const died = yearOf(person.deathday);

  return {
    id: person.id,
    name: creator.name,
    profile_path: person.profile_path,
    href: personHref({ id: person.id, name: person.name }),
    movies,
    lifespan: born ? (died ? `${born}–${died}` : `b. ${born}`) : "",
    birthplace: person.place_of_birth,
    bio: shortBio(person.biography ?? ""),
    filmCount: released.length,
    activeYears: years.length ? `${years[0]}–${years[years.length - 1]}` : "",
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

function pickRandom<T>(items: T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

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
  const { title, intro, sources } = greatCreatorsConfig;
  const router = useRouter();
  useRestoreLastCreator();

  const [spotlight, setSpotlight] = useState<number | null>(null);
  const spotlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(spotlightTimer.current), []);

  const jumpTo = (id: number) => {
    document
      .getElementById(floorDomId(id))
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setSpotlight(id);
    clearTimeout(spotlightTimer.current);
    spotlightTimer.current = setTimeout(() => setSpotlight(null), 2500);
  };

  const surpriseMe = () => {
    const pick = pickRandom(floors.filter((f) => f.id !== spotlight));
    if (pick) jumpTo(pick.id);
  };

  const pickFilm = (floor: CreatorFloor) => {
    const film = pickRandom(floor.movies);
    if (film) router.push(film.href);
  };

  const filmTotal = floors.reduce((sum, f) => sum + f.movies.length, 0);

  return (
    <Layout>
      <Head>
        <title>{`${title} — The Greatest Film Directors and Their Best Movies | JustPickAMovie`}</title>
        <meta
          name="description"
          content="Browse the most acclaimed film directors of all time, from Hitchcock and Kurosawa to Wong Kar-wai and Bong Joon-ho, each with their best movies ranked by rating."
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
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                type="button"
                onClick={surpriseMe}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
              >
                <span aria-hidden>🎲</span> Surprise me
              </button>
              <p className="text-sm text-text-muted">
                {floors.length} directors · {filmTotal} films to explore
              </p>
            </div>

            <nav
              aria-label="Jump to a director"
              className="mt-3 -mx-3 px-3 pt-6 flex gap-4 overflow-x-auto hide-scrollbar pb-2"
            >
              {floors.map((floor) => (
                <button
                  key={floor.id}
                  type="button"
                  onClick={() => jumpTo(floor.id)}
                  className="group flex flex-col flex-shrink-0 w-16 text-center outline-none"
                >
                  <span className="relative block w-16 h-16 overflow-hidden rounded-full bg-bg-card ring-2 ring-white/10 origin-bottom transition duration-200 ease-out motion-reduce:transition-none group-hover:scale-[1.3] group-hover:ring-accent group-hover:shadow-xl group-hover:shadow-black/60 group-focus-visible:scale-[1.3] group-focus-visible:ring-accent">
                    {profileUrl(floor.profile_path) ? (
                      <Image
                        src={profileUrl(floor.profile_path)!}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-text-muted font-bold">
                        {floor.name[0]}
                      </span>
                    )}
                  </span>
                  <span className="mt-1.5 block text-[11px] leading-tight text-text-secondary group-hover:text-text-primary group-focus-visible:text-text-primary transition-colors line-clamp-2">
                    {floor.name}
                  </span>
                </button>
              ))}
            </nav>

            <div className="mt-6 divide-y divide-border">
              {floors.map((floor, i) => (
                <section
                  key={floor.id}
                  id={floorDomId(floor.id)}
                  data-creator-floor
                  aria-label={floor.name}
                  className={`grid grid-cols-[80px_minmax(0,1fr)] md:grid-cols-[200px_minmax(0,1fr)] gap-x-4 md:gap-x-8 gap-y-4 py-8 scroll-mt-20 transition-colors duration-700 ${
                    spotlight === floor.id ? "bg-bg-secondary" : ""
                  }`}
                >
                  <Link
                    href={floor.href}
                    className="md:row-span-2 self-start relative z-0 aspect-[2/3] overflow-hidden rounded-lg bg-bg-card shadow-lg ring-1 ring-white/10 origin-left transition duration-300 ease-out motion-reduce:transition-none hover:z-10 hover:scale-110 hover:shadow-2xl hover:shadow-black/70 hover:ring-white/30"
                  >
                    {profileUrl(floor.profile_path) ? (
                      <Image
                        src={profileUrl(floor.profile_path, "h632")!}
                        alt={floor.name}
                        fill
                        priority={i === 0}
                        sizes="(min-width: 768px) 200px, 80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted text-4xl font-bold">
                        {floor.name[0]}
                      </div>
                    )}
                  </Link>

                  <div className="min-w-0">
                    <h2 className="text-xl md:text-2xl font-bold text-text-primary">
                      <Link
                        href={floor.href}
                        className="hover:text-white transition-colors"
                      >
                        {floor.name}
                      </Link>
                    </h2>
                    <p className="mt-0.5 text-sm text-text-muted">
                      {[floor.lifespan, floor.birthplace]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
                      {floor.filmCount > 0 && (
                        <li className="rounded-full bg-bg-card px-3 py-1">
                          🎬 {floor.filmCount} films directed
                        </li>
                      )}
                      {floor.activeYears && (
                        <li className="rounded-full bg-bg-card px-3 py-1">
                          📅 {floor.activeYears}
                        </li>
                      )}
                      <li className="rounded-full bg-bg-card px-3 py-1">
                        ⭐ Top rated: {floor.movies[0].title} (
                        {floor.movies[0].vote_average.toFixed(1)})
                      </li>
                    </ul>
                  </div>

                  <div className="col-span-2 md:col-span-1 min-w-0">
                    {floor.bio && (
                      <p className="mb-4 max-w-3xl text-sm text-text-secondary line-clamp-3">
                        {floor.bio}
                      </p>
                    )}
                    <CarouselSection items={floor.movies} className="" />
                    <button
                      type="button"
                      onClick={() => pickFilm(floor)}
                      className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:border-accent hover:text-white transition-colors"
                    >
                      <span aria-hidden>🎲</span> Pick a {floor.name} film
                      for me
                    </button>
                  </div>
                </section>
              ))}
            </div>

            <p className="mt-6 text-xs text-text-muted">
              Directors selected from{" "}
              {sources.map((source, i) => (
                <span key={source.url}>
                  {i > 0 && " and "}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-text-secondary"
                  >
                    {source.name}
                  </a>
                </span>
              ))}
              . Films ordered by TMDB rating.
            </p>
          </>
        )}
      </div>
    </Layout>
  );
}
