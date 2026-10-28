CREATE TABLE IF NOT EXISTS public.wikidata_facts_cache (
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  tmdb_id    INTEGER NOT NULL,
  data       JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (media_type, tmdb_id)
);

CREATE INDEX wikidata_facts_cache_expires_at_idx
  ON public.wikidata_facts_cache (expires_at);

COMMENT ON TABLE public.wikidata_facts_cache IS
  'Server-side cache for Wikidata facts and awards per title. No RLS — only accessed from the server.';

GRANT SELECT, INSERT, UPDATE ON public.wikidata_facts_cache TO anon, authenticated, service_role;
