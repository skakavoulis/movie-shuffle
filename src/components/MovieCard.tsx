import Image from "next/image";
import { posterUrl, type TMDBMovie } from "@/lib/tmdb";

interface MovieCardProps {
  movie: TMDBMovie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const year = movie.release_date?.split("-")[0] ?? "N/A";
  const rating = movie.vote_average?.toFixed(1) ?? "—";

  return (
    <div className="group relative flex-shrink-0 w-[180px] cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-10">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-bg-card shadow-lg">
        <Image
          src={posterUrl(movie.poster_path, "w342")}
          alt={movie.title}
          fill
          sizes="180px"
          className="object-cover transition-opacity duration-300 group-hover:opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <p className="text-sm font-semibold text-text-primary truncate">
            {movie.title}
          </p>
          <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {rating}
            </span>
            <span>{year}</span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-sm text-text-secondary truncate group-hover:text-text-primary transition-colors">
        {movie.title}
      </p>
    </div>
  );
}
