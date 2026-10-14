CREATE TABLE IF NOT EXISTS public.streaming_links_cache (
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  tmdb_id    INTEGER NOT NULL,
  data       JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (media_type, tmdb_id)
);

CREATE INDEX streaming_links_cache_expires_at_idx
  ON public.streaming_links_cache (expires_at);

COMMENT ON TABLE public.streaming_links_cache IS
  'Server-side cache for Streaming Availability (Movie of the Night) deep links, all countries per title. No RLS — only accessed from the server.';

GRANT SELECT, INSERT, UPDATE ON public.streaming_links_cache TO anon, authenticated, service_role;
