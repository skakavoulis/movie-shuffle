import Image from "next/image";
import Link from "next/link";
import { movieHref, posterUrl } from "@/lib/tmdb";
import type { DoubleFeature } from "@/lib/doubleFeature";

interface DoubleFeatureSectionProps {
  current: { title: string; poster_path: string | null };
  feature: DoubleFeature;
}

function Poster({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="relative w-[90px] md:w-[110px] aspect-[2/3] rounded-lg overflow-hidden bg-bg-card ring-1 ring-white/10 shadow-xl flex-shrink-0">
      <Image
        src={posterUrl(src, "w342")}
        alt={alt}
        fill
        sizes="110px"
        className="object-cover"
      />
    </div>
  );
}

export default function DoubleFeatureSection({
  current,
  feature,
}: DoubleFeatureSectionProps) {
  const { movie, label, reason } = feature;
  const year = movie.release_date?.split("-")[0];

  return (
    <section className="mt-12">
      <h2 className="text-xl md:text-2xl font-bold text-text-primary mb-6">
        Double Feature
      </h2>
      <Link
        href={movieHref(movie)}
        className="group flex flex-col sm:flex-row sm:items-center gap-6 p-5 rounded-xl bg-bg-card ring-1 ring-white/5 hover:ring-accent/50 transition-all"
      >
        <div className="flex items-center gap-3">
          <Poster src={current.poster_path} alt={current.title} />
          <span className="text-2xl font-bold text-text-muted">+</span>
          <Poster src={movie.poster_path} alt={movie.title} />
        </div>
        <div className="min-w-0">
          <span className="inline-block px-2 py-0.5 rounded bg-accent/15 text-xs font-semibold text-accent uppercase tracking-wide">
            {label}
          </span>
          <p className="mt-2 text-lg font-bold text-text-primary group-hover:text-accent transition-colors">
            Pair it with {movie.title}
            {year && (
              <span className="font-normal text-text-muted"> ({year})</span>
            )}
          </p>
          <p className="mt-1 text-sm text-text-secondary">{reason}</p>
        </div>
      </Link>
    </section>
  );
}
