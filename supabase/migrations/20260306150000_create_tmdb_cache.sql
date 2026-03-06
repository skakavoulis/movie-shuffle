CREATE TABLE IF NOT EXISTS public.tmdb_cache (
  cache_key  TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tmdb_cache_fetched_at_idx ON public.tmdb_cache (fetched_at);

COMMENT ON TABLE public.tmdb_cache IS 'Server-side cache for TMDB API responses. No RLS — only accessed from server.';
