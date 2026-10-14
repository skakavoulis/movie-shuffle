-- User-written reviews. TMDB's API can't accept reviews, so ours live here
-- and are shown alongside TMDB's on title pages.
CREATE TABLE IF NOT EXISTS public.reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id      INTEGER NOT NULL,
  media_type    TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  -- Same 10-point scale as TMDB's author_details.rating; one point is half a star.
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 10),
  content       TEXT NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 5000),
  -- Copied from the author's profile on save: profiles are private, reviews are public.
  author_name   TEXT NOT NULL,
  author_avatar TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, media_id, media_type)
);

CREATE INDEX IF NOT EXISTS reviews_title_idx
  ON public.reviews (media_type, media_id, created_at DESC);

COMMENT ON TABLE public.reviews IS 'User reviews for movies and TV shows, one per user per title.';

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
CREATE POLICY "Anyone can read reviews"
  ON public.reviews
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own reviews" ON public.reviews;
CREATE POLICY "Users can insert own reviews"
  ON public.reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- upsert() uses ON CONFLICT DO UPDATE, which needs an UPDATE policy.
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews"
  ON public.reviews
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
CREATE POLICY "Users can delete own reviews"
  ON public.reviews
  FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;

DROP TRIGGER IF EXISTS reviews_handle_updated_at ON public.reviews;
CREATE TRIGGER reviews_handle_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
