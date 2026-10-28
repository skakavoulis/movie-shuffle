import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  movieHref,
  posterUrl,
  tvHref,
  type Franchise,
  type FranchisePart,
  type FranchiseRelation,
} from "@/lib/tmdb";

type Props = {
  franchise: Franchise;
  /** The title whose page this is; highlighted instead of linked. */
  current: { mediaType: "movie" | "tv"; id: number };
};

const TILE_WIDTH = 140;

/**
 * How each relationship to the current title looks. Class names are written
 * out in full so Tailwind can see them.
 */
const RELATION_STYLES: Record<
  FranchiseRelation,
  { label: string; badge: string; ring: string; dot: string; swatch: string }
> = {
  spinoffOf: {
    label: "Original",
    badge: "bg-sky-500/90 text-white",
    ring: "ring-2 ring-sky-400/70",
    dot: "border-sky-400/70 text-sky-300",
    swatch: "bg-sky-400",
  },
  spinoff: {
    label: "Spin-off",
    badge: "bg-violet-500/90 text-white",
    ring: "ring-2 ring-violet-400/70",
    dot: "border-violet-400/70 text-violet-300",
    swatch: "bg-violet-400",
  },
  previous: {
    label: "Previous",
    badge: "bg-amber-500/90 text-black",
    ring: "ring-2 ring-amber-400/70",
    dot: "border-amber-400/70 text-amber-300",
    swatch: "bg-amber-400",
  },
  next: {
    label: "Next",
    badge: "bg-emerald-500/90 text-black",
    ring: "ring-2 ring-emerald-400/70",
    dot: "border-emerald-400/70 text-emerald-300",
    swatch: "bg-emerald-400",
  },
  franchise: {
    label: "Same franchise",
    badge: "bg-black/60 text-white/80",
    ring: "ring-1 ring-white/5",
    dot: "border-border text-text-secondary",
    swatch: "bg-text-muted",
  },
};

/** Legend order, closest relationships first. */
const LEGEND_ORDER: FranchiseRelation[] = [
  "spinoffOf",
  "spinoff",
  "previous",
  "next",
  "franchise",
];

function isUpcoming(releaseDate: string) {
  return !releaseDate || releaseDate > new Date().toISOString().slice(0, 10);
}

function partHref(part: FranchisePart) {
  return part.mediaType === "tv"
    ? tvHref({ id: part.id, name: part.title })
    : movieHref({ id: part.id, title: part.title });
}

/** "movies" or "series" when the franchise is all one kind, else "titles". */
function noun(parts: FranchisePart[], count: number) {
  const kinds = new Set(parts.map((p) => p.mediaType));
  if (kinds.size > 1) return count === 1 ? "title" : "titles";
  if (kinds.has("tv")) return "series";
  return count === 1 ? "movie" : "movies";
}

export default function FranchiseTimeline({ franchise, current: here }: Props) {
  const isHere = (p: FranchisePart) =>
    p.mediaType === here.mediaType && p.id === here.id;
  const scrollRef = useRef<HTMLOListElement>(null);
  const position = franchise.parts.findIndex(isHere);
  const released = franchise.parts.filter(
    (p) => !isUpcoming(p.release_date),
  ).length;

  // Relationship colours only help when they tell parts apart; a plain
  // collection or franchise-only list stays unbadged.
  const relations = new Set(
    franchise.parts.flatMap((p) =>
      p.relation && !isHere(p) ? [p.relation] : [],
    ),
  );
  const showRelations = [...relations].some((r) => r !== "franchise");
  const legend = LEGEND_ORDER.filter((r) => relations.has(r));

  // Long franchises scroll; start with the current movie in view. Sets
  // scrollLeft directly because scrollIntoView would also scroll the page.
  useEffect(() => {
    const list = scrollRef.current;
    const current = list?.querySelector<HTMLElement>("[aria-current]");
    if (!list || !current) return;
    list.scrollLeft =
      current.offsetLeft - list.clientWidth / 2 + current.clientWidth / 2;
  }, [here.mediaType, here.id]);

  return (
    <section className="mt-12">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-text-primary flex items-center gap-3">
          <svg
            className="w-6 h-6 text-accent shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5"
            />
          </svg>
          {franchise.name}
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Watch in release order · {released} {noun(franchise.parts, released)}
          {released < franchise.parts.length &&
            ` + ${franchise.parts.length - released} upcoming`}
          {position >= 0 && ` · this is part ${position + 1}`}
        </p>
        {showRelations && (
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
            {legend.map((r) => (
              <li key={r} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={`w-2.5 h-2.5 rounded-full ${RELATION_STYLES[r].swatch}`}
                />
                {RELATION_STYLES[r].label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ol
        ref={scrollRef}
        className="relative flex gap-5 overflow-x-auto hide-scrollbar pb-2"
      >
        {franchise.parts.map((part, i) => {
          const current = isHere(part);
          const upcoming = isUpcoming(part.release_date);
          const style =
            showRelations && !current && part.relation
              ? RELATION_STYLES[part.relation]
              : null;
          const year = part.release_date?.split("-")[0];

          const tile = (
            <>
              <div className="relative flex items-center mb-3">
                <span
                  className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    current
                      ? "bg-accent text-white shadow-lg shadow-accent/30"
                      : `bg-bg-card border ${style?.dot ?? "border-border text-text-secondary"} group-hover:border-accent/50 group-hover:text-text-primary`
                  } transition-colors`}
                >
                  {i + 1}
                </span>
                {/* Track to the next part; the gap-5 is bridged by -mr-5. */}
                {i < franchise.parts.length - 1 && (
                  <span aria-hidden className="h-px flex-1 -mr-5 bg-border" />
                )}
              </div>

              <div
                className={`relative aspect-[2/3] rounded-lg overflow-hidden bg-bg-card shadow-lg ${
                  current
                    ? "ring-2 ring-accent"
                    : `${style?.ring ?? "ring-1 ring-white/5"} group-hover:ring-accent/50`
                } ${upcoming ? "opacity-60" : ""} transition-all`}
              >
                <Image
                  src={posterUrl(part.poster_path, "w342")}
                  alt={part.title}
                  fill
                  sizes={`${TILE_WIDTH}px`}
                  className="object-cover"
                />
                {style && part.relation !== "franchise" && (
                  <span
                    className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-semibold shadow ${style.badge}`}
                  >
                    {style.label}
                  </span>
                )}
                {current && (
                  <span className="absolute bottom-0 inset-x-0 py-1 bg-accent text-white text-xs font-semibold text-center">
                    You&rsquo;re here
                  </span>
                )}
              </div>

              <p
                className={`mt-2 text-sm font-medium line-clamp-2 ${
                  current
                    ? "text-accent"
                    : "text-text-primary group-hover:text-accent"
                } transition-colors`}
              >
                {part.title}
              </p>
              <p className="text-xs text-text-muted">
                {upcoming ? (year ? `Coming ${year}` : "TBA") : year}
              </p>
            </>
          );

          return (
            <li
              key={`${part.mediaType}:${part.id}`}
              aria-current={current ? "page" : undefined}
              className="flex-shrink-0"
              style={{ width: TILE_WIDTH }}
            >
              {current ? (
                <div>{tile}</div>
              ) : (
                <Link href={partHref(part)} className="group block">
                  {tile}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
