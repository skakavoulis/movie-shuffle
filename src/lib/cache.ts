import { unstable_cache } from "next/cache";

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 1 week

/**
 * `unstable_cache` relies on the App Router incremental cache, which is absent
 * inside Pages Router API routes (and any other non-App-Router runtime path).
 * There we fall back to a per-instance in-memory cache instead of failing.
 */
const MAX_MEMORY_ENTRIES = 500;

type MemoryEntry = { value: Promise<unknown>; expiresAt: number };

const memory = new Map<string, MemoryEntry>();

function memoryCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number,
): Promise<T> {
  const now = Date.now();
  const hit = memory.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as Promise<T>;
  }

  const value = fetcher().catch((e) => {
    memory.delete(key);
    throw e;
  });
  memory.set(key, { value, expiresAt: now + ttl * 1000 });

  while (memory.size > MAX_MEMORY_ENTRIES) {
    const oldest = memory.keys().next();
    if (oldest.done) break;
    memory.delete(oldest.value);
  }

  return value;
}

function isIncrementalCacheMissing(e: unknown): boolean {
  return e instanceof Error && e.message.includes("incrementalCache missing");
}

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL_SECONDS,
): Promise<T> {
  const getCached = unstable_cache(fetcher, [key], {
    revalidate: ttl,
  });

  try {
    return await getCached();
  } catch (e) {
    if (!isIncrementalCacheMissing(e)) throw e;
    return memoryCached(key, fetcher, ttl);
  }
}
