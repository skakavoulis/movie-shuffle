import { useState, useEffect, useCallback, useRef } from "react";
import type { TMDBReview } from "@/lib/tmdb";

interface ReviewSectionProps {
  reviews: TMDBReview[];
  totalResults: number;
}

function StarRatingDisplay({ rating }: { rating: number }) {
  const stars = Math.round(rating / 2);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${
            i < stars ? "text-yellow-400" : "text-text-muted/30"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1.5 text-sm font-semibold text-yellow-400">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function avatarUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("/http")) return path.slice(1);
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/w185${path}`;
}

const PREVIEW_LENGTH = 400;

function ReviewModal({
  review,
  onClose,
}: {
  review: TMDBReview;
  onClose: () => void;
}) {
  const avatar = avatarUrl(review.author_details.avatar_path);
  const initial =
    (review.author_details.username || review.author)?.[0]?.toUpperCase() ??
    "?";
  const [visible, setVisible] = useState(false);
  const closingRef = useRef(false);

  const animateClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") animateClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [animateClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={animateClose}
    >
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`relative bg-bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl transition-all duration-200 ${
          visible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 p-6 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt={review.author}
                className="w-10 h-10 rounded-full object-cover bg-bg-primary flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-semibold flex-shrink-0">
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {review.author_details.username || review.author}
              </p>
              <p className="text-xs text-text-muted">
                {timeAgo(review.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {review.author_details.rating != null && (
              <StarRatingDisplay rating={review.author_details.rating} />
            )}
            <button
              onClick={animateClose}
              className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <p className="text-sm text-text-primary/90 leading-relaxed whitespace-pre-line">
            {review.content}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  onReadMore,
}: {
  review: TMDBReview;
  onReadMore: () => void;
}) {
  const avatar = avatarUrl(review.author_details.avatar_path);
  const initial =
    (review.author_details.username || review.author)?.[0]?.toUpperCase() ??
    "?";
  const isLong = review.content.length > PREVIEW_LENGTH;
  const displayContent = isLong
    ? review.content.slice(0, PREVIEW_LENGTH) + "..."
    : review.content;

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt={review.author}
              className="w-9 h-9 rounded-full object-cover bg-bg-primary"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent text-sm font-semibold">
              {initial}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-text-primary">
              {review.author_details.username || review.author}
            </p>
            <p className="text-xs text-text-muted">
              {timeAgo(review.created_at)}
            </p>
          </div>
        </div>
        {review.author_details.rating != null && (
          <StarRatingDisplay rating={review.author_details.rating} />
        )}
      </div>

      <p className="mt-3 text-sm text-text-primary/80 leading-relaxed whitespace-pre-line">
        {displayContent}
      </p>

      {isLong && (
        <button
          onClick={onReadMore}
          className="mt-2 text-xs text-accent hover:text-accent-hover transition-colors"
        >
          Read more
        </button>
      )}
    </div>
  );
}

export default function ReviewSection({
  reviews,
  totalResults,
}: ReviewSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [modalReview, setModalReview] = useState<TMDBReview | null>(null);
  const displayed = showAll ? reviews : reviews.slice(0, 3);

  return (
    <section className="mt-12">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-text-primary">
          Reviews
        </h2>
        <span className="text-sm text-text-muted">
          {totalResults} {totalResults === 1 ? "review" : "reviews"}
        </span>
      </div>

      {reviews.length === 0 ? (
        <p className="text-text-muted text-sm">
          No reviews yet for this movie.
        </p>
      ) : (
        <>
          <div className="space-y-4">
            {displayed.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onReadMore={() => setModalReview(review)}
              />
            ))}
          </div>

          {reviews.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-4 text-sm text-accent hover:text-accent-hover font-medium transition-colors"
            >
              {showAll
                ? "Show fewer reviews"
                : `Show all ${reviews.length} reviews`}
            </button>
          )}
        </>
      )}

      {modalReview && (
        <ReviewModal
          review={modalReview}
          onClose={() => setModalReview(null)}
        />
      )}
    </section>
  );
}
