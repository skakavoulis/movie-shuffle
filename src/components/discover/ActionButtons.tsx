import Link from "next/link";
import { movieHref, tvHref } from "@/lib/tmdb";
import { CrossIcon, InfoIcon, HeartIcon } from "./Icons";
import type { DiscoverItem } from "./types";
import { isMovie } from "./types";

const BURST_OFFSETS = [
  { tx: "-32px", ty: "0" },
  { tx: "32px", ty: "0" },
  { tx: "0", ty: "-32px" },
  { tx: "0", ty: "32px" },
  { tx: "-22px", ty: "-22px" },
  { tx: "22px", ty: "-22px" },
  { tx: "-22px", ty: "22px" },
  { tx: "22px", ty: "22px" },
];

interface ActionButtonsProps {
  currentItem: DiscoverItem | undefined;
  likeBurst: boolean;
  onSkip: () => void;
  onLike: () => void;
}

export default function ActionButtons({
  currentItem,
  likeBurst,
  onSkip,
  onLike,
}: ActionButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-5 py-3 flex-shrink-0">
      <button
        onClick={onSkip}
        className="w-16 h-16 rounded-full bg-bg-card border-2 border-gray-400/30 flex items-center justify-center text-gray-400 hover:bg-gray-400/10 hover:border-gray-400/60 hover:scale-110 active:scale-90 transition-all shadow-lg"
        aria-label="Skip"
      >
        <CrossIcon />
      </button>

      {currentItem && (
        <Link
          href={
            isMovie(currentItem)
              ? movieHref(currentItem)
              : tvHref(currentItem)
          }
          className="w-12 h-12 rounded-full bg-bg-card border-2 border-blue-400/30 flex items-center justify-center text-blue-400 hover:bg-blue-400/10 hover:border-blue-400/60 hover:scale-110 active:scale-90 transition-all shadow-lg"
          aria-label="View movie details"
        >
          <InfoIcon />
        </Link>
      )}

      <button
        onClick={onLike}
        className="relative w-16 h-16 rounded-full bg-bg-card border-2 border-red-400/30 flex items-center justify-center text-red-400 hover:bg-red-400/10 hover:border-red-400/60 hover:scale-110 active:scale-90 transition-all shadow-lg overflow-visible"
        aria-label="Like"
      >
        {likeBurst &&
          BURST_OFFSETS.map((p, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 pointer-events-none"
              style={
                {
                  "--tx": p.tx,
                  "--ty": p.ty,
                  animation: "like-burst-particle 0.5s ease-out forwards",
                } as React.CSSProperties
              }
            />
          ))}
        <HeartIcon
          className={`w-7 h-7 transition-colors duration-75 ${
            likeBurst
              ? "fill-red-500 text-red-500 animate-[like-heart-pop_0.5s_ease-out]"
              : "fill-none stroke-current"
          }`}
          filled={likeBurst}
        />
      </button>
    </div>
  );
}
