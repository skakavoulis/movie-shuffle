import { config } from "./config";
import { cached } from "./cache";
import { createTitleCache } from "./titleCache";

/**
 * Deep links to titles on streaming services, from the Streaming Availability
 * API by Movie of the Night (https://www.movieofthenight.com/about/api).
 * One request returns every country, so results are cached per title.
 */

export type StreamingOptionType =
  | "subscription"
  | "free"
  | "rent"
  | "buy"
  | "addon";

export interface StreamingOption {
  /** Service id, e.g. "netflix", "prime", "apple". */
  service: string;
  type: StreamingOptionType;
  /** Add-on channel name for `addon` options, e.g. "HBO Max" on Prime Video. */
  addon?: string;
  link: string;
  price?: { amount: string; currency: string };
}

/** Keyed by lowercase ISO country code, e.g. "gr". */
export type StreamingOptionsByCountry = Record<string, StreamingOption[]>;

interface MOTNStreamingOption {
  service: { id: string };
  type: StreamingOptionType;
  addon?: { id: string; name: string };
  link: string;
  price?: { amount: string; currency: string };
}

interface MOTNShow {
  streamingOptions?: Record<string, MOTNStreamingOption[]>;
}

const LINKS_TTL_SECONDS = 7 * 24 * 60 * 60; // 1 week
const MEMORY_TTL_SECONDS = 60 * 60; // 1 hour

const cachedStreamingOptions = createTitleCache<StreamingOptionsByCountry>({
  table: "streaming_links_cache",
  ttlSeconds: LINKS_TTL_SECONDS,
  label: "streaming-links",
});

/** Keeps only what link resolution needs; the raw response is ~300 KB per title. */
function trimOption(o: MOTNStreamingOption): StreamingOption {
  return {
    service: o.service.id,
    type: o.type,
    ...(o.addon ? { addon: o.addon.name } : {}),
    link: o.link,
    ...(o.price
      ? { price: { amount: o.price.amount, currency: o.price.currency } }
      : {}),
  };
}

async function fetchStreamingOptions(
  mediaType: "movie" | "tv",
  tmdbId: number,
): Promise<StreamingOptionsByCountry> {
  const res = await fetch(
    `${config.motn.baseUrl}/shows/${mediaType}/${tmdbId}`,
    { headers: { "X-API-Key": config.motn.apiKey } },
  );

  // Unknown titles are cached as empty so they don't spend quota again.
  if (res.status === 404) return {};
  if (!res.ok) {
    throw new Error(
      `Streaming Availability API error: ${res.status} ${res.statusText}`,
    );
  }

  const show = (await res.json()) as MOTNShow;
  const byCountry: StreamingOptionsByCountry = {};
  for (const [country, options] of Object.entries(
    show.streamingOptions ?? {},
  )) {
    byCountry[country] = options.map(trimOption);
  }
  return byCountry;
}

/**
 * Resolves to null instead of throwing so that an unset key, a spent monthly
 * quota, or an outage degrades to search links rather than erroring.
 * The in-memory layer spares a Supabase round trip on repeat views.
 */
export async function getStreamingOptions(
  mediaType: "movie" | "tv",
  tmdbId: number,
  region: string,
): Promise<StreamingOption[] | null> {
  if (!config.motn.apiKey) return null;

  try {
    const byCountry = await cached(
      `motn:${mediaType}:${tmdbId}`,
      () => cachedStreamingOptions(mediaType, tmdbId, fetchStreamingOptions),
      MEMORY_TTL_SECONDS,
    );
    return byCountry[region.toLowerCase()] ?? [];
  } catch (e) {
    console.error(
      `[streaming-links] ${mediaType}:${tmdbId}:`,
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}
