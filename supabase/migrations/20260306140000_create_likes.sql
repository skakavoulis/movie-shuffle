CREATE TABLE IF NOT EXISTS public.likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id   INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  title      TEXT NOT NULL DEFAULT '',
  poster_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, media_id, media_type)
);

CREATE INDEX likes_user_id_idx ON public.likes (user_id, media_type, created_at DESC);

COMMENT ON TABLE public.likes IS 'User likes for movies and TV shows.';

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own likes"
  ON public.likes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own likes"
  ON public.likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON public.likes
  FOR DELETE
  USING (auth.uid() = user_id);
