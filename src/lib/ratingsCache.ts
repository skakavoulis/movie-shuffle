import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config";
import type { ExternalRatings } from "./ratings";

const RATINGS_TTL_SECONDS = 7 * 24 * 60 * 60; // 1 week
const TABLE = "external_ratings_cache";

interface CacheRow {
  data: ExternalRatings;
  expires_at: string;
}

type MediaType = "movie" | "tv";
type RatingsFetcher = (
  mediaType: MediaType,
  tmdbId: number,
) => Promise<ExternalRatings>;

let client: SupabaseClient | null | undefined;
const inflight = new Map<string, Promise<ExternalRatings>>();
const refreshing = new Map<string, Promise<void>>();

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

async function readCachedRatings(
  sb: SupabaseClient,
  mediaType: MediaType,
  tmdbId: number,
): Promise<{ data: ExternalRatings; stale: boolean } | null> {
  const { data: row, error } = await sb
    .from(TABLE)
    .select("data, expires_at")
    .eq("media_type", mediaType)
    .eq("tmdb_id", tmdbId)
    .maybeSingle<CacheRow>();

  if (error) {
    console.error(
      `[ratings] failed to read ${mediaType}:${tmdbId}:`,
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

async function writeCachedRatings(
  sb: SupabaseClient,
  mediaType: MediaType,
  tmdbId: number,
  data: ExternalRatings,
): Promise<void> {
  const now = new Date();
  const { error } = await sb.from(TABLE).upsert(
    {
      media_type: mediaType,
      tmdb_id: tmdbId,
      data,
      fetched_at: now.toISOString(),
      expires_at: new Date(
        now.getTime() + RATINGS_TTL_SECONDS * 1000,
      ).toISOString(),
    },
    { onConflict: "media_type,tmdb_id" },
  );
  if (error) {
    console.error(
      `[ratings] failed to write ${mediaType}:${tmdbId}:`,
      error.message,
    );
  }
}

function refreshCachedRatings(
  sb: SupabaseClient,
  mediaType: MediaType,
  tmdbId: number,
  fetchRatings: RatingsFetcher,
): void {
  const key = `${mediaType}:${tmdbId}`;
  if (refreshing.has(key) || inflight.has(key)) return;

  const promise = fetchRatings(mediaType, tmdbId)
    .then((fresh) => writeCachedRatings(sb, mediaType, tmdbId, fresh))
    .catch((e) => {
      console.error(
        `[ratings] background refresh failed ${key}:`,
        e instanceof Error ? e.message : e,
      );
    })
    .finally(() => refreshing.delete(key));

  refreshing.set(key, promise);
}

export async function cachedExternalRatings(
  mediaType: MediaType,
  tmdbId: number,
  fetchRatings: RatingsFetcher,
): Promise<ExternalRatings> {
  const key = `${mediaType}:${tmdbId}`;
  const sb = getClient();

  if (sb) {
    const hit = await readCachedRatings(sb, mediaType, tmdbId);
    if (hit) {
      if (hit.stale) {
        refreshCachedRatings(sb, mediaType, tmdbId, fetchRatings);
      }
      return hit.data;
    }
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const fresh = await fetchRatings(mediaType, tmdbId);
    if (sb) await writeCachedRatings(sb, mediaType, tmdbId, fresh);
    return fresh;
  })().finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}
