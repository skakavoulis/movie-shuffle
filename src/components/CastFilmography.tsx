import { useState } from "react";
import Link from "next/link";
import { movieHref, tvHref, type TMDBPersonDetails } from "@/lib/tmdb";

type Credits = NonNullable<TMDBPersonDetails["combined_credits"]>;

export interface FilmographyEntry {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  date?: string;
  /** Character(s) for Acting, job(s) for crew departments. */
  role: string;
  department: string;
  voteAverage: number;
  voteCount: number;
  popularity: number;
}

// Below this many votes a rating says little, so those titles sort last.
const MIN_RATING_VOTES = 20;

export const SELF_CHARACTER = /^(self|himself|herself|themselves)\b/i;

function isSelfAppearance(e: FilmographyEntry) {
  return e.department === "Acting" && SELF_CHARACTER.test(e.role);
}

// One entry per title per department, merging repeated roles or jobs
// (e.g. "Producer, Writer") that TMDB lists as separate credits.
export function buildFilmography(credits: Credits): FilmographyEntry[] {
  const entries = new Map<string, FilmographyEntry>();
  const add = (
    c: Credits["cast"][number] | Credits["crew"][number],
    department: string,
    role: string,
  ) => {
    const key = `${department}-${c.media_type}-${c.id}`;
    const existing = entries.get(key);
    if (existing) {
      if (role && !existing.role.split(" / ").includes(role)) {
        existing.role = existing.role ? `${existing.role} / ${role}` : role;
      }
      return;
    }
    entries.set(key, {
      id: c.id,
      mediaType: c.media_type,
      title: (c.media_type === "movie" ? c.title : c.name) ?? "",
      posterPath: c.poster_path,
      date: (c.media_type === "movie" ? c.release_date : c.first_air_date) || undefined,
      role,
      department,
      voteAverage: c.vote_average ?? 0,
      voteCount: c.vote_count ?? 0,
      popularity: c.popularity ?? 0,
    });
  };
  for (const c of credits.cast ?? []) add(c, "Acting", c.character ?? "");
  for (const c of credits.crew ?? []) add(c, c.department, c.job);
  return [...entries.values()];
}

// Whole years from one YYYY-MM-DD date to another, parsed without time
// zones so a birthday never shifts by a day.
export function yearsBetween(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  let years = ty - fy;
  if (tm < fm || (tm === fm && td < fd)) years--;
  return years;
}

type SortKey = "year" | "rating" | "popularity";
type MediaFilter = "all" | "movie" | "tv";

const SORTS: Record<SortKey, (a: FilmographyEntry, b: FilmographyEntry) => number> = {
  year: (a, b) => (b.date ?? "").localeCompare(a.date ?? ""),
  rating: (a, b) => {
    const aRated = a.voteCount >= MIN_RATING_VOTES;
    const bRated = b.voteCount >= MIN_RATING_VOTES;
    if (aRated !== bRated) return aRated ? -1 : 1;
    return b.voteAverage - a.voteAverage;
  },
  popularity: (a, b) => b.popularity - a.popularity,
};

interface CastFilmographyProps {
  entries: FilmographyEntry[];
  birthday: string | null;
  deathday: string | null;
}

export default function CastFilmography({
  entries,
  birthday,
  deathday,
}: CastFilmographyProps) {
  // Hidden by default, unless self appearances are all the acting there is
  // (hosts, documentary subjects), which would leave the list empty.
  const [showSelf, setShowSelf] = useState(
    () =>
      !entries.some((e) => e.department === "Acting" && !isSelfAppearance(e)),
  );
  const hasSelf = entries.some(isSelfAppearance);
  const shown = showSelf
    ? entries
    : entries.filter((e) => !isSelfAppearance(e));

  // Acting first, then the other departments by how much work is in each.
  const counts = new Map<string, number>();
  for (const e of shown) {
    counts.set(e.department, (counts.get(e.department) ?? 0) + 1);
  }
  const departments = [...counts.entries()].sort(([a, ac], [b, bc]) =>
    a === "Acting" ? -1 : b === "Acting" ? 1 : bc - ac,
  );

  const [department, setDepartment] = useState(departments[0]?.[0] ?? "Acting");
  const [media, setMedia] = useState<MediaFilter>("all");
  const [sort, setSort] = useState<SortKey>("year");

  const inDepartment = shown.filter((e) => e.department === department);
  const hasBothMedia =
    inDepartment.some((e) => e.mediaType === "movie") &&
    inDepartment.some((e) => e.mediaType === "tv");
  const visible = inDepartment
    .filter((e) => media === "all" || e.mediaType === media)
    .sort(SORTS[sort]);

  if (entries.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-text-primary mb-4">Filmography</h2>

      {departments.length > 1 && (
        <div
          role="tablist"
          aria-label="Department"
          className="flex gap-1 overflow-x-auto pb-1 mb-3"
        >
          {departments.map(([d, count]) => (
            <button
              key={d}
              role="tab"
              aria-selected={d === department}
              onClick={() => {
                setDepartment(d);
                setMedia("all");
              }}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                d === department
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {d}
              <span
                className={`ml-1.5 tabular-nums ${
                  d === department ? "text-white/70" : "text-text-muted"
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {hasBothMedia ? (
          <div className="flex rounded-lg bg-bg-card border border-border p-0.5">
            {(
              [
                ["all", "All"],
                ["movie", "Film"],
                ["tv", "TV"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                aria-pressed={media === value}
                onClick={() => setMedia(value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  media === value
                    ? "bg-accent text-white shadow-sm"
                    : "text-text-secondary hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-4">
          {hasSelf && department === "Acting" && (
            <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer select-none">
              <button
                type="button"
                role="switch"
                aria-checked={showSelf}
                onClick={() => setShowSelf((v) => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  showSelf ? "bg-accent" : "bg-white/15"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    showSelf ? "translate-x-4" : ""
                  }`}
                />
              </button>
              Show &ldquo;as Self&rdquo; appearances
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-text-muted">
            Sort by
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="bg-bg-card border border-border rounded-lg px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value="year">Year</option>
              <option value="rating">Rating</option>
              <option value="popularity">Popularity</option>
            </select>
          </label>
        </div>
      </div>

      <div className="bg-bg-card rounded-xl border border-border overflow-hidden">
        {visible.map((e, i) => {
          const href =
            e.mediaType === "movie"
              ? movieHref({ id: e.id, title: e.title })
              : tvHref({ id: e.id, name: e.title });
          const year = e.date?.split("-")[0];
          // No age for posthumous releases or an unknown birthday.
          const age =
            birthday && e.date && !(deathday && e.date > deathday)
              ? yearsBetween(birthday, e.date)
              : null;
          const role =
            e.department === "Acting"
              ? e.role && `as ${e.role}`
              : e.role;

          return (
            <Link
              key={`${e.mediaType}-${e.id}`}
              href={href}
              className={`flex items-center gap-4 px-4 py-3 hover:bg-bg-hover transition-colors ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <span className="text-sm text-text-muted w-12 flex-shrink-0 text-right">
                {year || "—"}
              </span>
              <span className="hidden sm:inline text-xs text-text-muted w-14 flex-shrink-0 tabular-nums">
                {age !== null && age >= 0 ? `age ${age}` : ""}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-semibold text-text-muted uppercase flex-shrink-0">
                {e.mediaType === "movie" ? "Film" : "TV"}
              </span>
              <span className="text-sm text-text-primary font-medium truncate">
                {e.title}
              </span>
              {sort === "rating" && e.voteCount >= MIN_RATING_VOTES && (
                <span className="text-xs text-yellow-400 tabular-nums flex-shrink-0">
                  ★ {e.voteAverage.toFixed(1)}
                </span>
              )}
              {role && (
                <span className="text-sm text-text-muted truncate ml-auto flex-shrink-0 max-w-[40%]">
                  {role}
                </span>
              )}
            </Link>
          );
        })}
        {visible.length === 0 && (
          <p className="px-4 py-6 text-sm text-text-muted">No credits here.</p>
        )}
      </div>
    </section>
  );
}
