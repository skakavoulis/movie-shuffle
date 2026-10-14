import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config";

type MediaType = "movie" | "tv";
type TitleFetcher<T> = (mediaType: MediaType, tmdbId: number) => Promise<T>;

interface CacheRow<T> {
  data: T;
  expires_at: string;
}

interface TitleCacheOptions {
  /** Supabase table keyed by (media_type, tmdb_id) with data/fetched_at/expires_at columns. */
  table: string;
  ttlSeconds: number;
  /** Prefix for log lines, e.g. "ratings". */
  label: string;
}

let client: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  if (typeof window !== "undefined") {
    client = null;
    return null;
  }

  const { url, anonKey } = config.supabase;
  if (!url || !anonKey) {
    client = null;
    return null;
  }

  client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/**
 * Builds a per-title cache backed by a Supabase table. Stale rows are served
 * immediately and refreshed in the background; concurrent misses for the same
 * title share one fetch. Without Supabase config it degrades to fetching.
 */
export function createTitleCache<T>({
  table,
  ttlSeconds,
  label,
}: TitleCacheOptions) {
  const inflight = new Map<string, Promise<T>>();
  const refreshing = new Map<string, Promise<void>>();

  async function read(
    sb: SupabaseClient,
    mediaType: MediaType,
    tmdbId: number,
  ): Promise<{ data: T; stale: boolean } | null> {
    const { data: row, error } = await sb
      .from(table)
      .select("data, expires_at")
      .eq("media_type", mediaType)
      .eq("tmdb_id", tmdbId)
      .maybeSingle<CacheRow<T>>();

    if (error) {
      console.error(
        `[${label}] failed to read ${mediaType}:${tmdbId}:`,
        error.message,
      );
      return null;
    }
    if (!row) return null;

    return {
      data: row.data,
      stale: new Date(row.expires_at).getTime() <= Date.now(),
    };
  }

  async function write(
    sb: SupabaseClient,
    mediaType: MediaType,
    tmdbId: number,
    data: T,
  ): Promise<void> {
    const now = new Date();
    const { error } = await sb.from(table).upsert(
      {
        media_type: mediaType,
        tmdb_id: tmdbId,
        data,
        fetched_at: now.toISOString(),
        expires_at: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
      },
      { onConflict: "media_type,tmdb_id" },
    );
    if (error) {
      console.error(
        `[${label}] failed to write ${mediaType}:${tmdbId}:`,
        error.message,
      );
    }
  }

  function refresh(
    sb: SupabaseClient,
    mediaType: MediaType,
    tmdbId: number,
    fetcher: TitleFetcher<T>,
  ): void {
    const key = `${mediaType}:${tmdbId}`;
    if (refreshing.has(key) || inflight.has(key)) return;

    const promise = fetcher(mediaType, tmdbId)
      .then((fresh) => write(sb, mediaType, tmdbId, fresh))
      .catch((e) => {
        console.error(
          `[${label}] background refresh failed ${key}:`,
          e instanceof Error ? e.message : e,
        );
      })
      .finally(() => refreshing.delete(key));

    refreshing.set(key, promise);
  }

  return async function cachedTitle(
    mediaType: MediaType,
    tmdbId: number,
    fetcher: TitleFetcher<T>,
  ): Promise<T> {
    const key = `${mediaType}:${tmdbId}`;
    const sb = getClient();

    if (sb) {
      const hit = await read(sb, mediaType, tmdbId);
      if (hit) {
        if (hit.stale) refresh(sb, mediaType, tmdbId, fetcher);
        return hit.data;
      }
    }

    const pending = inflight.get(key);
    if (pending) return pending;

    const promise = (async () => {
      const fresh = await fetcher(mediaType, tmdbId);
      if (sb) await write(sb, mediaType, tmdbId, fresh);
      return fresh;
    })().finally(() => inflight.delete(key));

    inflight.set(key, promise);
    return promise;
  };
}
