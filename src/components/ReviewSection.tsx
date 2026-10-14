import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import type { TMDBReview } from "@/lib/tmdb";
import type { SiteReview } from "@/lib/reviews";
import { useAuth } from "@/context/AuthContext";
import Modal, { CloseButton } from "@/components/Modal";
import ReviewForm from "@/components/ReviewForm";
import SignInPrompt from "@/components/SignInPrompt";

interface ReviewSectionProps {
  mediaType: "movie" | "tv";
  mediaId: number;
  title: string;
  reviews: TMDBReview[];
  totalResults: number;
}

/** Site and TMDB reviews in one shape for display. */
interface DisplayReview {
  key: string;
  source: "site" | "tmdb";
  author: string;
  avatar: string | null;
  rating: number | null;
  content: string;
  createdAt: string;
  isOwn: boolean;
}

/** Opens the review form when someone lands here after signing in. */
const WRITE_HASH = "#write-review";

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
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
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


function fromTMDB(review: TMDBReview): DisplayReview {
  return {
    key: `tmdb:${review.id}`,
    source: "tmdb",
    author: review.author_details.username || review.author,
    avatar: avatarUrl(review.author_details.avatar_path),
    rating: review.author_details.rating,
    content: review.content,
    createdAt: review.created_at,
    isOwn: false,
  };
}

function fromSite(review: SiteReview): DisplayReview {
  return {
    key: `site:${review.id}`,
    source: "site",
    author: review.author_name,
    avatar: review.author_avatar,
    rating: review.rating,
    content: review.content,
    createdAt: review.created_at,
    isOwn: review.is_own,
  };
}

function byNewest(a: DisplayReview, b: DisplayReview) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function ReviewAuthor({
  review,
  size,
}: {
  review: DisplayReview;
  size: "sm" | "md";
}) {
  const initial = review.author?.[0]?.toUpperCase() ?? "?";
  const box = size === "md" ? "w-10 h-10" : "w-9 h-9 text-sm";

  return (
    <div className="flex items-center gap-3 min-w-0">
      {review.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={review.avatar}
          alt={review.author}
          className={`${box} rounded-full object-cover bg-bg-primary flex-shrink-0`}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div
          className={`${box} rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-semibold flex-shrink-0`}
        >
          {initial}
        </div>
      )}
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <span className="truncate">{review.author}</span>
          <SourceBadge review={review} />
        </p>
        <p className="text-xs text-text-muted">{timeAgo(review.createdAt)}</p>
      </div>
    </div>
  );
}

function SourceBadge({ review }: { review: DisplayReview }) {
  const [label, style] = review.isOwn
    ? ["Your review", "bg-accent/15 text-accent"]
    : review.source === "site"
      ? ["JustPickAMovie", "bg-white/10 text-text-secondary"]
      : ["TMDB", "bg-white/5 text-text-muted"];
  return (
    <span
      className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${style}`}
    >
      {label}
    </span>
  );
}

function ReviewModal({
  review,
  onClose,
}: {
  review: DisplayReview;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} label={`Review by ${review.author}`}>
      {(close) => (
        <>
          <div className="flex items-center justify-between gap-4 p-6 border-b border-border">
            <ReviewAuthor review={review} size="md" />
            <div className="flex items-center gap-4 flex-shrink-0">
              {review.rating != null && (
                <StarRatingDisplay rating={review.rating} />
              )}
              <CloseButton onClick={close} />
            </div>
          </div>
          <div className="p-6 overflow-y-auto">
            <p className="text-sm text-text-primary/90 leading-relaxed whitespace-pre-line">
              {review.content}
            </p>
          </div>
        </>
      )}
    </Modal>
  );
}

function ReviewCard({
  review,
  onReadMore,
  onEdit,
}: {
  review: DisplayReview;
  onReadMore: () => void;
  onEdit: () => void;
}) {
  const isLong = review.content.length > PREVIEW_LENGTH;
  const displayContent = isLong
    ? review.content.slice(0, PREVIEW_LENGTH) + "..."
    : review.content;

  return (
    <div
      className={`bg-bg-card border rounded-xl p-5 ${
        review.isOwn ? "border-accent/40" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <ReviewAuthor review={review} size="sm" />
        {review.rating != null && <StarRatingDisplay rating={review.rating} />}
      </div>

      <p className="mt-3 text-sm text-text-primary/80 leading-relaxed whitespace-pre-line break-words">
        {displayContent}
      </p>

      {(isLong || review.isOwn) && (
        <div className="mt-2 flex gap-4">
          {isLong && (
            <button
              onClick={onReadMore}
              className="text-xs text-accent hover:text-accent-hover transition-colors"
            >
              Read more
            </button>
          )}
          {review.isOwn && (
            <button
              onClick={onEdit}
              className="text-xs text-text-secondary hover:text-white transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.232 5.232l3.536 3.536M9 13l6.232-6.232a2.5 2.5 0 113.536 3.536L12.536 16.536 9 17l.464-3.536z M5 19h14"
      />
    </svg>
  );
}

export default function ReviewSection({
  mediaType,
  mediaId,
  title,
  reviews,
  totalResults,
}: ReviewSectionProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [showAll, setShowAll] = useState(false);
  const [modalReview, setModalReview] = useState<DisplayReview | null>(null);
  const [dialog, setDialog] = useState<"form" | "sign-in" | null>(null);

  // Tagged with the title and viewer they were loaded for, so another title's
  // reviews (or a signed-out `is_own`) never show while the next load runs.
  const loadKey = `${mediaType}:${mediaId}:${user?.id ?? ""}`;
  const [site, setSite] = useState<{ key: string; reviews: SiteReview[] }>({
    key: "",
    reviews: [],
  });
  const siteReviews = site.key === loadKey ? site.reviews : [];

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const q = new URLSearchParams({
      media_type: mediaType,
      media_id: String(mediaId),
    });
    fetch(`/api/reviews?${q}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: SiteReview[]) => {
        if (!cancelled) setSite({ key: loadKey, reviews: rows });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mediaType, mediaId, loadKey, authLoading]);

  // Back from signing in via the prompt below: open the form straight away.
  useEffect(() => {
    if (authLoading || !user || window.location.hash !== WRITE_HASH) return;
    history.replaceState(null, "", window.location.pathname + window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off, from the URL
    setDialog("form");
  }, [authLoading, user]);

  const ownReview = siteReviews.find((r) => r.is_own) ?? null;
  const combined = [
    ...siteReviews.map(fromSite).sort(byNewest),
    ...reviews.map(fromTMDB).sort(byNewest),
  ];
  const displayed = showAll ? combined : combined.slice(0, 3);
  const count = siteReviews.length + totalResults;

  function openForm() {
    if (authLoading) return;
    setDialog(user ? "form" : "sign-in");
  }

  function setSiteReviews(update: (prev: SiteReview[]) => SiteReview[]) {
    setSite({ key: loadKey, reviews: update(siteReviews) });
  }

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-text-primary">
          Reviews
        </h2>
        <span className="text-sm text-text-muted">
          {count} {count === 1 ? "review" : "reviews"}
        </span>
        <button
          type="button"
          onClick={openForm}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-semibold text-white transition-colors"
        >
          <PencilIcon />
          {ownReview ? "Edit your review" : "Write a review"}
        </button>
      </div>

      {combined.length === 0 ? (
        <p className="text-text-muted text-sm">
          No reviews yet. Be the first to share what you thought.
        </p>
      ) : (
        <>
          <div className="space-y-4">
            {displayed.map((review) => (
              <ReviewCard
                key={review.key}
                review={review}
                onReadMore={() => setModalReview(review)}
                onEdit={openForm}
              />
            ))}
          </div>

          {combined.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-4 text-sm text-accent hover:text-accent-hover font-medium transition-colors"
            >
              {showAll
                ? "Show fewer reviews"
                : `Show all ${combined.length} reviews`}
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

      {dialog === "form" && (
        <ReviewForm
          mediaType={mediaType}
          mediaId={mediaId}
          title={title}
          existing={ownReview}
          onSaved={(saved) =>
            setSiteReviews((prev) => [
              saved,
              ...prev.filter((r) => r.id !== saved.id),
            ])
          }
          onDeleted={() =>
            setSiteReviews((prev) => prev.filter((r) => !r.is_own))
          }
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === "sign-in" && (
        <SignInPrompt
          title="Sign in to write a review"
          message={`Reviews are written by JustPickAMovie members. Sign in or create a free account to share what you thought of ${title}. We'll bring you right back here.`}
          returnTo={`${router.asPath.split("#")[0]}${WRITE_HASH}`}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  );
}
