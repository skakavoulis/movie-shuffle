import Image from "next/image";
import Link from "next/link";
import { backdropUrl, type MediaItem } from "@/lib/tmdb";

interface HeroBannerProps {
  item: MediaItem;
}

export default function HeroBanner({ item }: HeroBannerProps) {
  const bgUrl = backdropUrl(item.backdrop_path, "original");
  const year = item.releaseDate?.split("-")[0] ?? "";
  const rating = item.vote_average?.toFixed(1) ?? "";

  return (
    <section className="relative w-full h-[70vh] min-h-[480px] max-h-[720px] overflow-hidden">
      {bgUrl ? (
        <Image
          src={bgUrl}
          alt={item.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-bg-secondary" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg-primary/80 via-transparent to-transparent" />

      <div className="relative z-10 flex flex-col justify-end h-full px-6 md:px-12 pb-16 max-w-3xl">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white drop-shadow-lg">
          {item.title}
        </h1>

        <div className="flex items-center gap-4 mt-4 text-sm md:text-base text-text-secondary">
          {rating && (
            <span className="flex items-center gap-1 text-yellow-400 font-semibold">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {rating}
            </span>
          )}
          {year && <span>{year}</span>}
        </div>

        <p className="mt-4 text-base md:text-lg text-text-primary/90 line-clamp-3 leading-relaxed">
          {item.overview}
        </p>

        <div className="flex gap-3 mt-6">
          <Link
            href={item.href}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-colors shadow-lg shadow-accent/20"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
            Details
          </Link>
        </div>
      </div>
    </section>
  );
}
