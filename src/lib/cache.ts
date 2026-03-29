import { unstable_cache } from "next/cache";

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 1 week

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL_SECONDS,
): Promise<T> {
  const getCached = unstable_cache(fetcher, [key], {
    revalidate: ttl,
  });
  return getCached();
}
