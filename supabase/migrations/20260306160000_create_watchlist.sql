CREATE TABLE IF NOT EXISTS public.watchlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id   INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  status     TEXT NOT NULL CHECK (status IN ('want_to_watch', 'watched')),
  title      TEXT NOT NULL DEFAULT '',
  poster_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, media_id, media_type)
);

CREATE INDEX watchlist_user_id_idx ON public.watchlist (user_id, media_type, status, created_at DESC);

COMMENT ON TABLE public.watchlist IS 'User watchlist with want_to_watch and watched statuses.';

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own watchlist"
  ON public.watchlist
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist"
  ON public.watchlist
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist"
  ON public.watchlist
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist"
  ON public.watchlist
  FOR DELETE
  USING (auth.uid() = user_id);
