/** Reviews written on this site (TMDB's API can't accept reviews). */

export const REVIEW_MAX_LENGTH = 5000;

/** A site review as returned by /api/reviews. */
export interface SiteReview {
  id: string;
  /** 1–10, the same scale as TMDB's author ratings; 1 point is half a star. */
  rating: number;
  content: string;
  author_name: string;
  author_avatar: string | null;
  created_at: string;
  updated_at: string;
  /** True when the signed-in user wrote it, so they can edit or delete it. */
  is_own: boolean;
}
