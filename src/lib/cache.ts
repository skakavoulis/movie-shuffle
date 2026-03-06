import { createClient } from "@supabase/supabase-js";
import { config } from "./config";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

function getSupabaseAdmin() {
  return createClient(config.supabase.url, config.supabase.anonKey, {
    auth: { persistSession: false },
  });
}

interface CacheRow {
  cache_key: string;
  data: unknown;
  fetched_at: string;
}

function isStale(fetchedAt: string): boolean {
  return Date.now() - new Date(fetchedAt).getTime() > CACHE_TTL_MS;
}

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const sb = getSupabaseAdmin();

  const { data: row } = await sb
    .from("tmdb_cache")
    .select("data, fetched_at")
    .eq("cache_key", key)
    .single<CacheRow>();

  if (row && !isStale(row.fetched_at)) {
    return row.data as T;
  }

  const fresh = await fetcher();

  sb.from("tmdb_cache")
    .upsert(
      {
        cache_key: key,
        data: fresh as unknown,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "cache_key" },
    )
    .then(({ error }) => {
      if (error)
        console.error(`[cache] failed to write key="${key}":`, error.message);
    });

  return fresh;
}
