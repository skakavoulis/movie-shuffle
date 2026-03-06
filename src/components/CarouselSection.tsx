import { useRef, useState, useCallback } from "react";
import type { MediaItem } from "@/lib/tmdb";
import MovieCard from "./MovieCard";

interface CarouselSectionProps {
  title: string;
  items: MediaItem[];
}

export default function CarouselSection({
  title,
  items,
}: CarouselSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
    setTimeout(checkScroll, 400);
  };

  if (!items.length) return null;

  return (
    <section className="relative px-6 md:px-12 py-6">
      <h2 className="text-xl md:text-2xl font-bold text-text-primary mb-4">
        {title}
      </h2>
      <div className="relative group/carousel">
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className="absolute left-0 top-0 bottom-8 z-20 w-12 bg-gradient-to-r from-bg-primary to-transparent flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity"
          >
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto hide-scrollbar pb-2"
        >
          {items.map((item) => (
            <MovieCard key={item.id} item={item} />
          ))}
        </div>
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className="absolute right-0 top-0 bottom-8 z-20 w-12 bg-gradient-to-l from-bg-primary to-transparent flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity"
          >
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}
