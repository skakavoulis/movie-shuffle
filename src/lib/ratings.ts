import { config } from "./config";
import { cachedExternalRatings } from "./ratingsCache";

export interface ExternalRatings {
  /** Out of 10. */
  imdb: number | null;
  imdbVotes: number | null;
  /** Rotten Tomatoes critic score, out of 100. */
  tomatometer: number | null;
  /** Rotten Tomatoes audience score, out of 100. */
  audienceScore: number | null;
  /** Metascore, out of 100. */
  metacritic: number | null;
}

interface MDBListRating {
  source: string;
  value: number | null;
  votes?: number | null;
}

interface MDBListResponse {
  ratings?: MDBListRating[];
}

function pick(ratings: MDBListRating[], ...sources: string[]) {
  for (const source of sources) {
    const hit = ratings.find(
      (r) => r.source === source && typeof r.value === "number",
    );
    if (hit) return hit;
  }
  return null;
}

async function fetchExternalRatings(
  mediaType: "movie" | "tv",
  tmdbId: number,
): Promise<ExternalRatings> {
  const path = mediaType === "tv" ? "show" : "movie";
  const url = new URL(`${config.mdblist.baseUrl}/tmdb/${path}/${tmdbId}`);
  url.searchParams.set("apikey", config.mdblist.apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`MDBList API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as MDBListResponse;
  const ratings = data.ratings ?? [];
  const imdb = pick(ratings, "imdb");

  return {
    imdb: imdb?.value ?? null,
    imdbVotes: imdb?.votes ?? null,
    tomatometer: pick(ratings, "tomatoes")?.value ?? null,
    // MDBList renamed the audience source from `tomatoesaudience` to `popcorn`.
    audienceScore: pick(ratings, "popcorn", "tomatoesaudience")?.value ?? null,
    metacritic: pick(ratings, "metacritic")?.value ?? null,
  };
}

/**
 * Resolves to null instead of throwing so that an unset key, a spent daily
 * quota, or an MDBList outage degrades to hiding the pills rather than
 * failing the title page render.
 */
export async function getExternalRatings(
  mediaType: "movie" | "tv",
  tmdbId: number,
): Promise<ExternalRatings | null> {
  if (!config.mdblist.apiKey) return null;

  try {
    return await cachedExternalRatings(mediaType, tmdbId, fetchExternalRatings);
  } catch {
    return null;
  }
}
