import { useEffect, useState } from "react";
import Image from "next/image";
import { useRegion } from "@/context/RegionContext";
import type { NewsArticle } from "@/lib/news";

function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000,
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface MovieNewsSectionProps {
  title: string;
}

export default function MovieNewsSection({
  title: movieTitle,
}: MovieNewsSectionProps) {
  const { region, loading: regionLoading } = useRegion();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (regionLoading) return;

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      q: movieTitle,
      country: region,
    });

    fetch(`/api/movie-news?${params}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: NewsArticle[]) => {
        if (!cancelled) setArticles(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setArticles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [movieTitle, region, regionLoading]);

  if (!loading && !articles.length) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl md:text-2xl font-bold text-text-primary mb-6 flex items-center gap-3">
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
            d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5"
          />
        </svg>
        News and articles
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-bg-card border border-border rounded-xl overflow-hidden animate-pulse"
            >
              <div className="aspect-[16/9] bg-bg-secondary" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-bg-secondary rounded w-3/4" />
                <div className="h-3 bg-bg-secondary rounded w-full" />
                <div className="h-3 bg-bg-secondary rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article) => (
            <a
              key={article.url}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-bg-card border border-border rounded-xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 hover:border-accent/30"
            >
              <div className="relative aspect-[16/9] bg-bg-secondary overflow-hidden">
                {article.image ? (
                  <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-bg-secondary to-bg-primary">
                    <svg
                      className="w-12 h-12 text-text-muted"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                  {article.title}
                </h3>
                <p className="mt-2 text-xs text-text-secondary line-clamp-2">
                  {article.description}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
                  <span className="truncate max-w-[60%]">
                    {article.source.name}
                  </span>
                  <time dateTime={article.publishedAt}>
                    {timeAgo(article.publishedAt)}
                  </time>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
