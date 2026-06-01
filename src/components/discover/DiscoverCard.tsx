import Image from "next/image";
import Link from "next/link";
import { posterUrl, movieHref, tvHref } from "@/lib/tmdb";
import { StarIcon, ChevronRightIcon } from "./Icons";
import type { DiscoverItem, DiscoverMediaType } from "./types";
import { isMovie, MOVIE_GENRE_MAP, TV_GENRE_MAP } from "./types";

interface DiscoverCardProps {
  item: DiscoverItem;
  index: number;
  mediaType: DiscoverMediaType;
  cardRef?: React.Ref<HTMLDivElement>;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerCancel?: () => void;
  onTransitionEnd?: (e: React.TransitionEvent) => void;
}

export default function DiscoverCard({
  item,
  index,
  mediaType,
  cardRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onTransitionEnd,
}: DiscoverCardProps) {
  const isTop = index === 0;
  const genreMap = mediaType === "movie" ? MOVIE_GENRE_MAP : TV_GENRE_MAP;
  const itemGenres = item.genre_ids
    .slice(0, 2)
    .map((id) => genreMap[id])
    .filter(Boolean);
  const title = isMovie(item) ? item.title : item.name;
  const year = isMovie(item)
    ? item.release_date?.split("-")[0]
    : item.first_air_date?.split("-")[0];
  const rating = item.vote_average?.toFixed(1);
  const href = isMovie(item) ? movieHref(item) : tvHref(item);

  return (
    <div
      ref={isTop ? cardRef : undefined}
      className="absolute inset-0 rounded-2xl overflow-hidden bg-bg-card ring-1 ring-white/10"
      style={{
        zIndex: 10 - index,
        transform: isTop
          ? undefined
          : `scale(${1 - index * 0.04}) translateY(${index * 10}px)`,
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        touchAction: isTop ? "none" : undefined,
        willChange: isTop ? "transform" : undefined,
        cursor: isTop ? "grab" : undefined,
        pointerEvents: isTop ? undefined : "none",
        boxShadow: isTop
          ? "0 25px 50px -12px rgba(0,0,0,0.6)"
          : "0 10px 30px -10px rgba(0,0,0,0.4)",
      }}
      onPointerDown={isTop ? onPointerDown : undefined}
      onPointerMove={isTop ? onPointerMove : undefined}
      onPointerUp={isTop ? onPointerUp : undefined}
      onPointerCancel={isTop ? onPointerCancel : undefined}
      onTransitionEnd={isTop ? onTransitionEnd : undefined}
    >
      <Image
        src={posterUrl(item.poster_path, "w500")}
        alt={title}
        fill
        sizes="(max-width: 768px) 78vw, 340px"
        className="object-cover pointer-events-none"
        priority={index === 0}
        draggable={false}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent pointer-events-none" />

      <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-none">
        {itemGenres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {itemGenres.map((g) => (
              <span
                key={g}
                className="px-2 py-0.5 rounded-full bg-white/15 text-white/80 text-xs font-medium backdrop-blur-sm"
              >
                {g}
              </span>
            ))}
          </div>
        )}
        <h2 className="text-xl font-bold text-white leading-tight">{title}</h2>
        <div className="flex items-center gap-3 mt-1 text-sm text-white/70">
          {year && <span>{year}</span>}
          {rating && rating !== "0.0" && (
            <span className="flex items-center gap-1">
              <StarIcon />
              {rating}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-white/60 line-clamp-2 leading-relaxed">
          {item.overview}
        </p>
        <Link
          href={href}
          className="inline-flex items-center gap-1 mt-2 text-xs text-accent font-semibold hover:text-accent-hover transition-colors pointer-events-auto"
        >
          View Details
          <ChevronRightIcon />
        </Link>
      </div>
    </div>
  );
}
