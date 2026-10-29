import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config";

type MediaType = "movie" | "tv";
type TitleFetcher<T> = (mediaType: MediaType, tmdbId: number) => Promise<T>;

interface CacheRow<T> {
  data: T;
  expires_at: string;
}

interface TitleCacheOptions<T> {
  /** Supabase table keyed by (media_type, tmdb_id) with data/fetched_at/expires_at columns. */
  table: string;
  ttlSeconds: number;
  /** Prefix for log lines, e.g. "ratings". */
  label: string;
  /**
   * Rows failing this are treated as missing and refetched, so a change to
   * the cached shape takes effect without waiting out the TTL.
   */
  isCurrent?: (data: T) => boolean;
}

let client: SupabaseClient | null | undefined;

/**
 * How long a cache read may take before the render gives up on Supabase and
 * fetches directly. Keeps a slow database from holding pages up.
 */
const READ_TIMEOUT_MS = 1500;
/** How long to bypass Supabase after it fails or times out. */
const BREAKER_COOLDOWN_MS = 60_000;
/** Spread expiries so a batch of rows written together doesn't expire together. */
const TTL_JITTER = 0.2;

/**
 * Shared by every title cache on this instance: once Supabase errors or times
 * out, all caches skip it for a while instead of piling more reads and writes
 * onto a database that is already struggling (e.g. out of Disk IO budget).
 * Without this, each failed read looked like a miss and triggered a fetch
 * plus an upsert, so a slow database got more load the slower it got.
 */
let bypassUntil = 0;

function tripBreaker(label: string, reason: string) {
  if (Date.now() >= bypassUntil) {
    console.warn(
      `[${label}] Supabase cache unavailable (${reason}); bypassing for ${BREAKER_COOLDOWN_MS / 1000}s`,
    );
  }
  bypassUntil = Date.now() + BREAKER_COOLDOWN_MS;
}

function getActiveClient(): SupabaseClient | null {
  return Date.now() < bypassUntil ? null : getClient();
}

function expiresAt(from: Date, ttlSeconds: number): string {
  const jitter = 1 - TTL_JITTER / 2 + Math.random() * TTL_JITTER;
  return new Date(from.getTime() + ttlSeconds * 1000 * jitter).toISOString();
}

function getClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  if (typeof window !== "undefined") {
    client = null;
    return null;
  }

  // The cache tables have RLS on and no anon/authenticated grants, so only the
  // service role can use them. Never fall back to the public anon key.
  const { url, serviceRoleKey } = config.supabase;
  if (!url || !serviceRoleKey) {
    console.warn(
      "[titleCache] SUPABASE_SERVICE_ROLE_KEY is not set; title caches are disabled and every render fetches upstream",
    );
    client = null;
    return null;
  }

  client = createClient(url, serviceRoleKey, {
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
  isCurrent,
}: TitleCacheOptions<T>) {
  const inflight = new Map<string, Promise<T>>();
  const refreshing = new Map<string, Promise<void>>();

  async function read(
    sb: SupabaseClient,
    mediaType: MediaType,
    tmdbId: number,
  ): Promise<{ data: T; stale: boolean } | null | "error"> {
    const { data: row, error } = await sb
      .from(table)
      .select("data, expires_at")
      .eq("media_type", mediaType)
      .eq("tmdb_id", tmdbId)
      .abortSignal(AbortSignal.timeout(READ_TIMEOUT_MS))
      .maybeSingle<CacheRow<T>>();

    if (error) {
      // An error isn't a miss: writing back now would only add load.
      tripBreaker(label, `read ${mediaType}:${tmdbId}: ${error.message}`);
      return "error";
    }
    if (!row) return null;
    if (isCurrent && !isCurrent(row.data)) return null;

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
    previous?: T,
  ): Promise<void> {
    if (Date.now() < bypassUntil) return;

    const now = new Date();
    const times = {
      fetched_at: now.toISOString(),
      expires_at: expiresAt(now, ttlSeconds),
    };

    // A refresh usually finds the same data. Then only bump the timestamps,
    // so the JSONB isn't rewritten (with its WAL and TOAST churn) every TTL.
    const unchanged =
      previous !== undefined && JSON.stringify(previous) === JSON.stringify(data);

    const { error } = unchanged
      ? await sb
          .from(table)
          .update(times)
          .eq("media_type", mediaType)
          .eq("tmdb_id", tmdbId)
      : await sb
          .from(table)
          .upsert(
            { media_type: mediaType, tmdb_id: tmdbId, data, ...times },
            { onConflict: "media_type,tmdb_id" },
          );
    if (error) {
      tripBreaker(label, `write ${mediaType}:${tmdbId}: ${error.message}`);
    }
  }

  function refresh(
    sb: SupabaseClient,
    mediaType: MediaType,
    tmdbId: number,
    fetcher: TitleFetcher<T>,
    previous: T,
  ): void {
    const key = `${mediaType}:${tmdbId}`;
    if (refreshing.has(key) || inflight.has(key)) return;

    const promise = fetcher(mediaType, tmdbId)
      .then((fresh) => write(sb, mediaType, tmdbId, fresh, previous))
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
    const sb = getActiveClient();

    if (sb) {
      const hit = await read(sb, mediaType, tmdbId);
      if (hit && hit !== "error") {
        if (hit.stale) refresh(sb, mediaType, tmdbId, fetcher, hit.data);
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
