-- The per-title cache tables are only used from the server, but they were
-- created without RLS and with INSERT/UPDATE granted to anon and authenticated.
-- Because the anon key is public, anyone could read, overwrite or poison them
-- through the Data API. The server now uses the service role, which bypasses
-- RLS, so enable RLS with no policies and drop every client-role grant.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'external_ratings_cache',
    'streaming_links_cache',
    'wikidata_facts_cache',
    'franchise_cache'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE ON public.%I TO service_role', t
    );
    EXECUTE format(
      'COMMENT ON TABLE public.%I IS %L', t,
      'Server-side cache. RLS on with no policies; only the service role may access it.'
    );
  END LOOP;
END
$$;
