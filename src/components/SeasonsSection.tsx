import { useRef, useState } from "react";
import Image from "next/image";
import {
  posterUrl,
  stillUrl,
  type TMDBEpisode,
  type TMDBSeasonSummary,
} from "@/lib/tmdb";

interface SeasonsSectionProps {
  showId: number;
  seasons: TMDBSeasonSummary[];
}

type LoadState = "loading" | "loaded" | "error";

function formatAirDate(date: string | null) {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Specials (season 0) sit after the numbered seasons. */
function orderSeasons(seasons: TMDBSeasonSummary[]) {
  return seasons
    .filter((s) => s.episode_count > 0)
    .sort((a, b) => {
      if (a.season_number === 0) return 1;
      if (b.season_number === 0) return -1;
      return a.season_number - b.season_number;
    });
}

function StarIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

/** Unrated episodes come back as 0 from TMDB and would drag the mean down. */
function averageEpisodeRating(episodes: TMDBEpisode[]) {
  const rated = episodes.filter((e) => e.vote_average > 0);
  if (rated.length === 0) return null;
  const sum = rated.reduce((total, e) => total + e.vote_average, 0);
  return (sum / rated.length).toFixed(1);
}

function EpisodeRow({ episode }: { episode: TMDBEpisode }) {
  const still = stillUrl(episode.still_path);
  const airDate = formatAirDate(episode.air_date);
  const rating =
    episode.vote_average > 0 ? episode.vote_average.toFixed(1) : null;

  return (
    <li className="flex gap-4 p-4 rounded-xl bg-white/[0.02] hover:bg-white/5 transition-colors">
      <div className="relative flex-shrink-0 w-[120px] sm:w-[160px] aspect-video rounded-lg overflow-hidden bg-bg-primary">
        {still ? (
          <Image
            src={still}
            alt={episode.name}
            fill
            sizes="160px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
            No image
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-text-primary">
            <span className="text-text-muted mr-2">
              E{episode.episode_number}
            </span>
            {episode.name}
          </p>
          {rating && (
            <span className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-yellow-400">
              <StarIcon />
              {rating}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 mt-1 text-xs text-text-muted">
          {airDate && <span>{airDate}</span>}
          {episode.runtime ? <span>{episode.runtime}m</span> : null}
        </div>

        {episode.overview && (
          <p className="mt-2 text-sm text-text-secondary leading-relaxed line-clamp-2 sm:line-clamp-3">
            {episode.overview}
          </p>
        )}
      </div>
    </li>
  );
}

function EpisodeRowSkeleton() {
  return (
    <li className="flex gap-4 p-4 rounded-xl bg-white/[0.02] animate-pulse">
      <div className="flex-shrink-0 w-[120px] sm:w-[160px] aspect-video rounded-lg bg-bg-secondary" />

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="h-4 w-1/2 rounded bg-bg-secondary" />
          <div className="h-3 w-8 flex-shrink-0 rounded bg-bg-secondary" />
        </div>
        <div className="h-3 w-1/4 rounded bg-bg-secondary" />
        <div className="h-3 w-full rounded bg-bg-secondary" />
        <div className="h-3 w-2/3 rounded bg-bg-secondary" />
      </div>
    </li>
  );
}

export default function SeasonsSection({
  showId,
  seasons,
}: SeasonsSectionProps) {
  const ordered = orderSeasons(seasons);
  const [openSeason, setOpenSeason] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<Record<number, TMDBEpisode[]>>({});
  const [states, setStates] = useState<Record<number, LoadState>>({});
  const [loadedShowId, setLoadedShowId] = useState(showId);
  // Requests in flight when the show changes must not write into the new show.
  const currentShowId = useRef(showId);

  // Next.js reuses this component across /tv/[slug] navigations, so the caches
  // above have to be dropped manually when a different show comes in.
  if (showId !== loadedShowId) {
    setLoadedShowId(showId);
    currentShowId.current = showId;
    setOpenSeason(null);
    setEpisodes({});
    setStates({});
  }

  if (ordered.length === 0) return null;

  async function loadSeason(seasonNumber: number) {
    const requestedShowId = showId;
    setStates((prev) => ({ ...prev, [seasonNumber]: "loading" }));
    try {
      const q = new URLSearchParams({
        id: String(requestedShowId),
        season: String(seasonNumber),
      });
      const res = await fetch(`/api/tv-season?${q}`);
      if (!res.ok) throw new Error("Request failed");
      const data: { episodes?: TMDBEpisode[] } = await res.json();
      if (currentShowId.current !== requestedShowId) return;
      setEpisodes((prev) => ({ ...prev, [seasonNumber]: data.episodes ?? [] }));
      setStates((prev) => ({ ...prev, [seasonNumber]: "loaded" }));
    } catch {
      if (currentShowId.current !== requestedShowId) return;
      setStates((prev) => ({ ...prev, [seasonNumber]: "error" }));
    }
  }

  function toggleSeason(seasonNumber: number) {
    if (openSeason === seasonNumber) {
      setOpenSeason(null);
      return;
    }
    setOpenSeason(seasonNumber);
    if (states[seasonNumber] !== "loading" && !episodes[seasonNumber]) {
      loadSeason(seasonNumber);
    }
  }

  return (
    <section className="mt-12">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-text-primary">
          Seasons & Episodes
        </h2>
        <span className="text-sm text-text-muted">
          {ordered.length} {ordered.length === 1 ? "season" : "seasons"}
        </span>
      </div>

      <div className="space-y-3">
        {ordered.map((season) => {
          const isOpen = openSeason === season.season_number;
          const state = states[season.season_number];
          const seasonEpisodes = episodes[season.season_number];
          const year = season.air_date?.split("-")[0];
          const panelId = `season-panel-${season.season_number}`;
          // Episodes are only fetched on expand, so fall back to the
          // season-level average TMDB ships with the show details.
          const averageRating = seasonEpisodes
            ? averageEpisodeRating(seasonEpisodes)
            : season.vote_average && season.vote_average > 0
              ? season.vote_average.toFixed(1)
              : null;

          return (
            <div
              key={season.id}
              className="bg-bg-card border border-border rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleSeason(season.season_number)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-bg-hover transition-colors"
              >
                <div className="relative flex-shrink-0 w-[52px] aspect-[2/3] rounded-md overflow-hidden bg-bg-primary">
                  <Image
                    src={posterUrl(season.poster_path, "w342")}
                    alt={season.name}
                    fill
                    sizes="52px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-text-primary truncate">
                    {season.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-x-2 text-xs text-text-muted">
                    <span>
                      {[
                        year,
                        `${season.episode_count} ${
                          season.episode_count === 1 ? "episode" : "episodes"
                        }`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {averageRating && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span
                          className="flex items-center gap-1 font-semibold text-yellow-400"
                          title="Average episode rating"
                        >
                          <StarIcon />
                          {averageRating}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <svg
                  className={`w-5 h-5 flex-shrink-0 text-text-muted transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isOpen && (
                <div id={panelId} className="px-4 pb-4 border-t border-border">
                  {season.overview && (
                    <p className="pt-4 text-sm text-text-secondary leading-relaxed">
                      {season.overview}
                    </p>
                  )}

                  {state === "loading" && (
                    <ul
                      className="mt-4 space-y-2"
                      aria-busy="true"
                      aria-label="Loading episodes"
                    >
                      {Array.from({
                        length: Math.min(season.episode_count, 4),
                      }).map((_, i) => (
                        <EpisodeRowSkeleton key={i} />
                      ))}
                    </ul>
                  )}

                  {state === "error" && (
                    <div className="py-6 flex items-center gap-3">
                      <p className="text-sm text-text-muted">
                        Could not load episodes.
                      </p>
                      <button
                        onClick={() => loadSeason(season.season_number)}
                        className="text-sm text-accent hover:text-accent-hover font-medium transition-colors"
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {seasonEpisodes &&
                    (seasonEpisodes.length > 0 ? (
                      <ul className="mt-4 space-y-2">
                        {seasonEpisodes.map((episode) => (
                          <EpisodeRow key={episode.id} episode={episode} />
                        ))}
                      </ul>
                    ) : (
                      <p className="py-6 text-sm text-text-muted">
                        No episode details available yet.
                      </p>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
