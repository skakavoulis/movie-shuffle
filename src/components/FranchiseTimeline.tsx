import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { movieHref, posterUrl, type TMDBCollection } from "@/lib/tmdb";

type Props = {
  collection: TMDBCollection;
  /** The movie whose page this is; highlighted instead of linked. */
  currentId: number;
};

const TILE_WIDTH = 140;

function isUpcoming(releaseDate: string) {
  return !releaseDate || releaseDate > new Date().toISOString().slice(0, 10);
}

export default function FranchiseTimeline({ collection, currentId }: Props) {
  const scrollRef = useRef<HTMLOListElement>(null);
  const position = collection.parts.findIndex((p) => p.id === currentId);
  const released = collection.parts.filter(
    (p) => !isUpcoming(p.release_date),
  ).length;

  // Long franchises scroll; start with the current movie in view. Sets
  // scrollLeft directly because scrollIntoView would also scroll the page.
  useEffect(() => {
    const list = scrollRef.current;
    const current = list?.querySelector<HTMLElement>("[aria-current]");
    if (!list || !current) return;
    list.scrollLeft =
      current.offsetLeft - list.clientWidth / 2 + current.clientWidth / 2;
  }, [currentId]);

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
          {collection.name}
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Watch in release order · {released}{" "}
          {released === 1 ? "movie" : "movies"}
          {released < collection.parts.length &&
            ` + ${collection.parts.length - released} upcoming`}
          {position >= 0 && ` · this is part ${position + 1}`}
        </p>
      </div>

      <ol
        ref={scrollRef}
        className="relative flex gap-5 overflow-x-auto hide-scrollbar pb-2"
      >
        {collection.parts.map((part, i) => {
          const current = part.id === currentId;
          const upcoming = isUpcoming(part.release_date);
          const year = part.release_date?.split("-")[0];

          const tile = (
            <>
              <div className="relative flex items-center mb-3">
                <span
                  className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    current
                      ? "bg-accent text-white shadow-lg shadow-accent/30"
                      : "bg-bg-card border border-border text-text-secondary group-hover:border-accent/50 group-hover:text-text-primary"
                  } transition-colors`}
                >
                  {i + 1}
                </span>
                {/* Track to the next part; the gap-5 is bridged by -mr-5. */}
                {i < collection.parts.length - 1 && (
                  <span aria-hidden className="h-px flex-1 -mr-5 bg-border" />
                )}
              </div>

              <div
                className={`relative aspect-[2/3] rounded-lg overflow-hidden bg-bg-card shadow-lg ${
                  current
                    ? "ring-2 ring-accent"
                    : "ring-1 ring-white/5 group-hover:ring-accent/50"
                } ${upcoming ? "opacity-60" : ""} transition-all`}
              >
                <Image
                  src={posterUrl(part.poster_path, "w342")}
                  alt={part.title}
                  fill
                  sizes={`${TILE_WIDTH}px`}
                  className="object-cover"
                />
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
              key={part.id}
              aria-current={current ? "page" : undefined}
              className="flex-shrink-0"
              style={{ width: TILE_WIDTH }}
            >
              {current ? (
                <div>{tile}</div>
              ) : (
                <Link href={movieHref(part)} className="group block">
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
