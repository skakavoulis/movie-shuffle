CREATE TABLE IF NOT EXISTS public.franchise_cache (
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  tmdb_id    INTEGER NOT NULL,
  data       JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (media_type, tmdb_id)
);

CREATE INDEX franchise_cache_expires_at_idx
  ON public.franchise_cache (expires_at);

COMMENT ON TABLE public.franchise_cache IS
  'Server-side cache for franchises built from Wikidata and TMDB, per title. No RLS — only accessed from the server.';

GRANT SELECT, INSERT, UPDATE ON public.franchise_cache TO anon, authenticated, service_role;
