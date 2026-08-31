CREATE TABLE IF NOT EXISTS public.external_ratings_cache (
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  tmdb_id    INTEGER NOT NULL,
  data       JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (media_type, tmdb_id)
);

CREATE INDEX external_ratings_cache_expires_at_idx
  ON public.external_ratings_cache (expires_at);

COMMENT ON TABLE public.external_ratings_cache IS
  'Server-side cache for MDBList external ratings. No RLS — only accessed from the server.';

GRANT SELECT, INSERT, UPDATE ON public.external_ratings_cache TO anon, authenticated, service_role;
