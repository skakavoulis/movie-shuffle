import type { ExternalRatings } from "./ratings";
import { createTitleCache } from "./titleCache";

const RATINGS_TTL_SECONDS = 7 * 24 * 60 * 60; // 1 week

export const cachedExternalRatings = createTitleCache<ExternalRatings>({
  table: "external_ratings_cache",
  ttlSeconds: RATINGS_TTL_SECONDS,
  label: "ratings",
});
