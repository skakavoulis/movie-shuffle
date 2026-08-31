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
  imdbUrl?: string | null;
  rtUrl?: string | null;
  metacriticUrl?: string | null;
}

interface MDBListRating {
  source: string;
  value: number | null;
  votes?: number | null;
  /** Path slug (RT, Metacritic) or a numeric popularity score (IMDb). */
  url?: string | number | null;
}

interface MDBListResponse {
  ids?: { imdb?: string | null };
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

/** MDBList stores RT/Metacritic slugs as `/m/jaws`; IMDb's `url` is a number. */
function ratingPath(rating: MDBListRating | null): string | null {
  const url = rating?.url;
  return typeof url === "string" && url.startsWith("/") ? url : null;
}

function imdbTitleUrl(imdbId: string | null | undefined): string | null {
  if (!imdbId || !/^tt\d+$/.test(imdbId)) return null;
  return `https://www.imdb.com/title/${imdbId}`;
}

function rottenTomatoesUrl(path: string | null): string | null {
  return path ? `https://www.rottentomatoes.com${path}` : null;
}

function metacriticTitleUrl(
  path: string | null,
  mediaType: "movie" | "tv",
): string | null {
  if (!path) return null;
  if (path.startsWith("/movie/") || path.startsWith("/tv/")) {
    return `https://www.metacritic.com${path}`;
  }
  const prefix = mediaType === "tv" ? "/tv" : "/movie";
  return `https://www.metacritic.com${prefix}${path}`;
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
  const tomatoes = pick(ratings, "tomatoes");
  const popcorn = pick(ratings, "popcorn", "tomatoesaudience");
  const metacritic = pick(ratings, "metacritic");

  return {
    imdb: imdb?.value ?? null,
    imdbVotes: imdb?.votes ?? null,
    tomatometer: tomatoes?.value ?? null,
    audienceScore: popcorn?.value ?? null,
    metacritic: metacritic?.value ?? null,
    imdbUrl: imdbTitleUrl(data.ids?.imdb),
    rtUrl: rottenTomatoesUrl(ratingPath(tomatoes) ?? ratingPath(popcorn)),
    metacriticUrl: metacriticTitleUrl(ratingPath(metacritic), mediaType),
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
