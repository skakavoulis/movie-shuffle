import { useState } from "react";
import Modal, { CloseButton } from "@/components/Modal";
import { REVIEW_MAX_LENGTH, type SiteReview } from "@/lib/reviews";

const STAR_PATH =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

function starsLabel(rating: number) {
  const stars = rating / 2;
  return `${stars} ${stars === 1 ? "star" : "stars"}`;
}

/** Five stars in half-star steps; the value is 1–10, 0 when unset. */
function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  function valueAt(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    return Math.min(10, Math.max(1, Math.ceil(fraction * 10)));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const next =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? Math.min(10, value + 1)
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? Math.max(1, value - 1)
          : e.key === "Home"
            ? 1
            : e.key === "End"
              ? 10
              : null;
    if (next === null) return;
    e.preventDefault();
    onChange(next);
  }

  return (
    <div className="flex items-center gap-3">
      <div
        role="slider"
        tabIndex={0}
        aria-label="Rating"
        aria-valuemin={1}
        aria-valuemax={10}
        aria-valuenow={value || undefined}
        aria-valuetext={value ? starsLabel(value) : "Not rated"}
        onPointerMove={(e) => setHover(valueAt(e))}
        onPointerLeave={() => setHover(0)}
        onClick={(e) => onChange(valueAt(e))}
        onKeyDown={handleKeyDown}
        className="flex cursor-pointer rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        {Array.from({ length: 5 }, (_, i) => {
          const fill = Math.min(2, Math.max(0, shown - i * 2));
          return (
            <span key={i} className="relative w-9 h-9 p-0.5">
              <svg
                className="w-full h-full text-text-muted/30"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d={STAR_PATH} />
              </svg>
              {fill > 0 && (
                <span
                  className="absolute inset-y-0 left-0 overflow-hidden p-0.5"
                  style={{ width: fill === 2 ? "100%" : "50%" }}
                >
                  <svg
                    className="w-8 h-8 text-yellow-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d={STAR_PATH} />
                  </svg>
                </span>
              )}
            </span>
          );
        })}
      </div>
      <span className="text-sm font-semibold text-yellow-400 tabular-nums min-w-[4.5rem]">
        {shown ? starsLabel(shown) : ""}
      </span>
    </div>
  );
}

interface ReviewFormProps {
  mediaType: "movie" | "tv";
  mediaId: number;
  title: string;
  /** The user's current review, when editing. */
  existing: SiteReview | null;
  onSaved: (review: SiteReview) => void;
  onDeleted: () => void;
  onClose: () => void;
}

export default function ReviewForm({
  mediaType,
  mediaId,
  title,
  existing,
  onSaved,
  onDeleted,
  onClose,
}: ReviewFormProps) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [content, setContent] = useState(existing?.content ?? "");
  const [busy, setBusy] = useState<"saving" | "deleting" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = content.trim();
  const canSave = rating > 0 && trimmed.length > 0 && busy === null;

  async function save(close: () => void) {
    if (!canSave) return;
    setBusy("saving");
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: mediaType,
          media_id: mediaId,
          rating,
          content: trimmed,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't save your review");
      onSaved(data as SiteReview);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your review");
      setBusy(null);
    }
  }

  async function remove(close: () => void) {
    setBusy("deleting");
    setError(null);
    try {
      const q = new URLSearchParams({
        media_type: mediaType,
        media_id: String(mediaId),
      });
      const res = await fetch(`/api/reviews?${q}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't delete your review");
      }
      onDeleted();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete your review");
      setBusy(null);
      setConfirmDelete(false);
    }
  }

  const heading = existing ? "Edit your review" : "Write a review";

  return (
    <Modal onClose={onClose} label={heading}>
      {(close) => (
        <form
          className="flex flex-col min-h-0"
          onSubmit={(e) => {
            e.preventDefault();
            save(close);
          }}
        >
          <div className="flex items-start justify-between gap-4 p-6 border-b border-border">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-text-primary">{heading}</h2>
              <p className="text-sm text-text-muted truncate">{title}</p>
            </div>
            <CloseButton onClick={close} />
          </div>

          <div className="p-6 space-y-5 overflow-y-auto">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">
                Your rating
              </p>
              <StarRatingInput value={rating} onChange={setRating} />
            </div>

            <div>
              <label
                htmlFor="review-content"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Your review
              </label>
              <textarea
                id="review-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={REVIEW_MAX_LENGTH}
                rows={7}
                placeholder={`What did you think of ${title}?`}
                className="w-full px-4 py-3 bg-bg-primary border border-border rounded-lg text-sm text-text-primary placeholder-text-muted leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
              />
              <p className="mt-1 text-right text-xs text-text-muted tabular-nums">
                {content.length} / {REVIEW_MAX_LENGTH}
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
              >
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 p-6 pt-0">
            {existing &&
              (confirmDelete ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-text-secondary">Delete your review?</span>
                  <button
                    type="button"
                    onClick={() => remove(close)}
                    disabled={busy !== null}
                    className="px-3 py-1.5 rounded-lg font-semibold text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {busy === "deleting" ? "Deleting…" : "Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={busy !== null}
                    className="px-3 py-1.5 rounded-lg font-semibold text-text-secondary hover:bg-white/5 transition-colors"
                  >
                    Keep
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy !== null}
                  className="text-sm font-medium text-text-muted hover:text-red-400 transition-colors"
                >
                  Delete review
                </button>
              ))}
            <div className="ml-auto flex gap-3">
              <button
                type="button"
                onClick={close}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSave}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-50 disabled:hover:bg-accent"
              >
                {busy === "saving"
                  ? "Saving…"
                  : existing
                    ? "Save changes"
                    : "Post review"}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
