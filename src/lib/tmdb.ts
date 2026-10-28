import { config, assertServerConfig } from "./config";
import { cached } from "./cache";

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date: string;
  genre_ids: number[];
  /** Present on list results; absent on some trimmed payloads. */
  vote_count?: number;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

/** A series' cast across all seasons, from `/tv/{id}/aggregate_credits`. */
export interface TMDBAggregateCastMember {
  id: number;
  name: string;
  profile_path: string | null;
  roles: { character: string; episode_count: number }[];
  total_episode_count: number;
  order: number;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface TMDBReviewAuthor {
  name: string;
  username: string;
  avatar_path: string | null;
  rating: number | null;
}

export interface TMDBReview {
  id: string;
  author: string;
  author_details: TMDBReviewAuthor;
  content: string;
  created_at: string;
  updated_at: string;
  url: string;
}

export interface TMDBTVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  first_air_date: string;
  genre_ids: number[];
  /** Present on list results; absent on some trimmed payloads. */
  vote_count?: number;
}

export interface TMDBSeasonSummary {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
  vote_average?: number;
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  episode_number: number;
  air_date: string | null;
  runtime: number | null;
  still_path: string | null;
  vote_average: number;
}

export interface TMDBSeasonDetails {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  air_date: string | null;
  poster_path: string | null;
  episodes: TMDBEpisode[];
}

export interface TMDBTVShowDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  first_air_date: string;
  last_air_date: string;
  tagline: string;
  status: string;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  genres: TMDBGenre[];
  networks: { id: number; name: string; logo_path: string | null }[];
  created_by: { id: number; name: string; profile_path: string | null }[];
  seasons?: TMDBSeasonSummary[];
  /** Trimmed to the top-billed cast; crew is dropped. */
  aggregate_credits?: {
    cast: TMDBAggregateCastMember[];
  };
  videos?: {
    results: TMDBVideo[];
  };
  similar?: {
    results: TMDBTVShow[];
  };
  /** Based on what viewers of this title also watched, unlike `similar`. */
  recommendations?: {
    results: TMDBTVShow[];
  };
  reviews?: {
    results: TMDBReview[];
    total_results: number;
  };
}

export type MediaItem = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  popularity?: number;
  releaseDate: string;
  href: string;
  mediaType?: "movie" | "tv";
};

export function movieToMediaItem(movie: TMDBMovie): MediaItem {
  return {
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    vote_average: movie.vote_average,
    releaseDate: movie.release_date,
    href: movieHref(movie),
    mediaType: "movie",
  };
}

export function tvShowToMediaItem(show: TMDBTVShow): MediaItem {
  return {
    id: show.id,
    title: show.name,
    overview: show.overview,
    poster_path: show.poster_path,
    backdrop_path: show.backdrop_path,
    vote_average: show.vote_average,
    releaseDate: show.first_air_date,
    href: tvHref(show),
    mediaType: "tv",
  };
}

export interface TMDBMovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date: string;
  runtime: number | null;
  tagline: string;
  status: string;
  genres: TMDBGenre[];
  production_companies: {
    id: number;
    name: string;
    logo_path: string | null;
  }[];
  budget: number;
  revenue: number;
  belongs_to_collection: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
  credits?: {
    cast: TMDBCastMember[];
    crew: TMDBCrewMember[];
  };
  videos?: {
    results: TMDBVideo[];
  };
  similar?: {
    results: TMDBMovie[];
  };
  /** Based on what viewers of this title also watched, unlike `similar`. */
  recommendations?: {
    results: TMDBMovie[];
  };
  reviews?: {
    results: TMDBReview[];
    total_results: number;
  };
}

interface TMDBListResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<T> {
  assertServerConfig();
  const url = new URL(`${config.tmdb.baseUrl}${endpoint}`);
  url.searchParams.set("api_key", config.tmdb.apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function getPopularMovies(page = 1) {
  return cached(`movies:popular:${page}`, () =>
    tmdbFetch<TMDBListResponse>("/movie/popular", { page: String(page) }),
  );
}

export async function getTopRatedMovies(page = 1) {
  return cached(`movies:top_rated:${page}`, () =>
    tmdbFetch<TMDBListResponse>("/movie/top_rated", { page: String(page) }),
  );
}

export async function getNowPlayingMovies(page = 1) {
  return cached(`movies:now_playing:${page}`, () =>
    tmdbFetch<TMDBListResponse>("/movie/now_playing", { page: String(page) }),
  );
}

export async function getTrendingMovies() {
  return cached("movies:trending", () =>
    tmdbFetch<TMDBListResponse>("/trending/movie/week"),
  );
}

export async function getMovieDetails(id: number) {
  return cached(`movie:${id}`, () =>
    tmdbFetch<TMDBMovieDetails>(`/movie/${id}`, {
      append_to_response: "credits,videos,similar,recommendations,reviews",
    }),
  );
}

/**
 * How a franchise part relates to the title whose page it's shown on, from
 * that title's point of view. "previous" and "next" are Wikidata's follows /
 * followed by, which for shared universes means release order rather than
 * story order.
 */
export type FranchiseRelation =
  | "spinoff"
  | "spinoffOf"
  | "previous"
  | "next"
  | "franchise";

/** One title in a franchise, trimmed to what the timeline renders. */
export interface FranchisePart {
  /** Unset for TMDB collections, where every part is simply a sibling. */
  relation?: FranchiseRelation;
  mediaType: "movie" | "tv";
  id: number;
  title: string;
  poster_path: string | null;
  /** Release date for movies, first air date for series; "" when unknown. */
  release_date: string;
  vote_average: number;
}

export interface Franchise {
  name: string;
  /** Ordered by release date; undated (unannounced) parts come last. */
  parts: FranchisePart[];
}

export function sortByReleaseDate(parts: FranchisePart[]): FranchisePart[] {
  return [...parts].sort((a, z) => {
    if (!a.release_date) return z.release_date ? 1 : 0;
    if (!z.release_date) return -1;
    return a.release_date.localeCompare(z.release_date);
  });
}

function movieToFranchisePart(movie: TMDBMovie): FranchisePart {
  return {
    mediaType: "movie",
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path,
    release_date: movie.release_date ?? "",
    vote_average: movie.vote_average,
  };
}

/** A TMDB movie collection, e.g. "The Dark Knight Collection". */
export async function getCollection(id: number): Promise<Franchise> {
  return cached(`collection:${id}`, async () => {
    const data = await tmdbFetch<{
      id: number;
      name: string;
      parts: TMDBMovie[];
    }>(`/collection/${id}`);
    return {
      name: data.name,
      parts: sortByReleaseDate(data.parts.map(movieToFranchisePart)),
    };
  });
}

/** What a franchise needs to know about any title, without the extras. */
export interface TitleSummary {
  part: FranchisePart;
  vote_count: number;
}

export async function getTitleSummary(
  mediaType: "movie" | "tv",
  id: number,
): Promise<TitleSummary> {
  return cached(`${mediaType}:${id}:summary`, async () => {
    if (mediaType === "movie") {
      const m = await tmdbFetch<TMDBMovie & { vote_count: number }>(
        `/movie/${id}`,
      );
      return { part: movieToFranchisePart(m), vote_count: m.vote_count };
    }
    const t = await tmdbFetch<TMDBTVShow & { vote_count: number }>(`/tv/${id}`);
    return {
      part: {
        mediaType: "tv",
        id: t.id,
        title: t.name,
        poster_path: t.poster_path,
        release_date: t.first_air_date ?? "",
        vote_average: t.vote_average,
      },
      vote_count: t.vote_count,
    };
  });
}

interface TMDBTVListResponse {
  page: number;
  results: TMDBTVShow[];
  total_pages: number;
  total_results: number;
}

export async function getPopularTVShows(page = 1) {
  return cached(`tv:popular:${page}`, () =>
    tmdbFetch<TMDBTVListResponse>("/tv/popular", { page: String(page) }),
  );
}

export async function getTopRatedTVShows(page = 1) {
  return cached(`tv:top_rated:${page}`, () =>
    tmdbFetch<TMDBTVListResponse>("/tv/top_rated", { page: String(page) }),
  );
}

export async function getOnTheAirTVShows(page = 1) {
  return cached(`tv:on_the_air:${page}`, () =>
    tmdbFetch<TMDBTVListResponse>("/tv/on_the_air", { page: String(page) }),
  );
}

export async function getTrendingTVShows() {
  return cached("tv:trending", () =>
    tmdbFetch<TMDBTVListResponse>("/trending/tv/week"),
  );
}

/** The trailer (or teaser) first, then the title's other YouTube videos. */
export function orderTitleVideos(videos: TMDBVideo[] = []): TMDBVideo[] {
  const trailer = videos.find(
    (v) =>
      v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"),
  );
  return [
    ...(trailer ? [trailer] : []),
    ...videos.filter(
      (v) =>
        v.site === "YouTube" &&
        v.type !== "Trailer" &&
        v.type !== "Teaser" &&
        v.id !== trailer?.id,
    ),
  ];
}

// `credits` on a series only lists the latest season's cast, so a show like
// The Office loses most of its regulars; `aggregate_credits` spans every
// season. It runs to hundreds of guest roles, so only the top billing is kept.
const TV_CAST_LIMIT = 20;

export async function getTVShowDetails(id: number) {
  return cached(`tv:${id}:aggregate`, async () => {
    const show = await tmdbFetch<TMDBTVShowDetails>(`/tv/${id}`, {
      append_to_response:
        "aggregate_credits,videos,similar,recommendations,reviews",
    });
    return {
      ...show,
      aggregate_credits: {
        cast: (show.aggregate_credits?.cast ?? []).slice(0, TV_CAST_LIMIT),
      },
    };
  });
}

/** Episode lists are only exposed per season, never on the show detail payload. */
export async function getTVSeasonDetails(tvId: number, seasonNumber: number) {
  return cached(`tv:${tvId}:season:${seasonNumber}`, () =>
    tmdbFetch<TMDBSeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`),
  );
}

export interface TMDBImage {
  file_path: string;
  width: number;
  height: number;
  aspect_ratio: number;
  vote_average: number;
  iso_639_1: string | null;
}

export interface TMDBTitleImages {
  id: number;
  backdrops: TMDBImage[];
  posters: TMDBImage[];
  logos: TMDBImage[];
}

export interface TMDBPersonImages {
  id: number;
  profiles: TMDBImage[];
}

/**
 * Kept apart from the detail payload: popular titles list hundreds of
 * images, which would bloat every server render. English and
 * language-neutral (textless) artwork only, so posters and logos are legible.
 */
export async function getTitleImages(mediaType: "movie" | "tv", id: number) {
  return cached(`${mediaType}:${id}:images`, () =>
    tmdbFetch<TMDBTitleImages>(`/${mediaType}/${id}/images`, {
      include_image_language: "en,null",
    }),
  );
}

export async function getPersonImages(id: number) {
  return cached(`person:${id}:images`, () =>
    tmdbFetch<TMDBPersonImages>(`/person/${id}/images`),
  );
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sampleMovies(movies: TMDBMovie[], count: number): TMDBMovie[] {
  return shuffleArray(movies).slice(0, count);
}

export interface TMDBWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
}

export async function getMovieGenres() {
  return cached("genres:movie", () =>
    tmdbFetch<{ genres: TMDBGenre[] }>("/genre/movie/list"),
  );
}

export interface TMDBWatchProviderRegion {
  iso_3166_1: string;
  english_name: string;
  native_name: string;
}

export async function getWatchProviderRegions() {
  return cached("watch_providers:regions", () =>
    tmdbFetch<{ results: TMDBWatchProviderRegion[] }>(
      "/watch/providers/regions"
    ),
  );
}

export async function getMovieWatchProviders(region: string) {
  return cached(`providers:movie:${region}`, () =>
    tmdbFetch<{ results: TMDBWatchProvider[] }>("/watch/providers/movie", {
      watch_region: region,
    }),
  );
}

export async function discoverMovies(params: Record<string, string>) {
  return tmdbFetch<TMDBListResponse>("/discover/movie", {
    include_adult: "false",
    sort_by: "popularity.desc",
    ...params,
  });
}

export async function getTVGenres() {
  return cached("genres:tv", () =>
    tmdbFetch<{ genres: TMDBGenre[] }>("/genre/tv/list"),
  );
}

export async function getTVWatchProviders(region: string) {
  return cached(`providers:tv:${region}`, () =>
    tmdbFetch<{ results: TMDBWatchProvider[] }>("/watch/providers/tv", {
      watch_region: region,
    }),
  );
}

export async function discoverTVShows(params: Record<string, string>) {
  return tmdbFetch<TMDBTVListResponse>("/discover/tv", {
    include_adult: "false",
    sort_by: "popularity.desc",
    ...params,
  });
}

/** Watch providers for a specific title, by country (e.g. US). */
export interface TMDBWatchProviderOffer {
  link: string;
  flatrate?: TMDBWatchProvider[];
  rent?: TMDBWatchProvider[];
  buy?: TMDBWatchProvider[];
  ads?: TMDBWatchProvider[];
  free?: TMDBWatchProvider[];
}

export interface TMDBTitleWatchProviders {
  id: number;
  results: Record<string, TMDBWatchProviderOffer>;
}

export async function getMovieWatchProvidersById(movieId: number) {
  return cached(`movie:${movieId}:watch_providers`, () =>
    tmdbFetch<TMDBTitleWatchProviders>(`/movie/${movieId}/watch/providers`),
  );
}

export async function getTVShowWatchProvidersById(tvId: number) {
  return cached(`tv:${tvId}:watch_providers`, () =>
    tmdbFetch<TMDBTitleWatchProviders>(`/tv/${tvId}/watch/providers`),
  );
}

/** Prefer US, then first available region. */
export function pickWatchRegion(
  results: Record<string, TMDBWatchProviderOffer>,
  culture: string,
): { region: string; offer: TMDBWatchProviderOffer } | null {
  const offer = results[culture];
  if (!offer) return null;

  return { region: culture, offer };
}

export function providerLogoUrl(
  path: string | null,
  size: "w45" | "w92" | "w154" | "original" = "w92",
) {
  if (!path) return null;
  return `${config.tmdb.imageBaseUrl}/${size}${path}`;
}

export function posterUrl(
  path: string | null,
  size: "w342" | "w500" | "w780" | "original" = "w500",
) {
  if (!path) return "/placeholder-poster.svg";
  return `${config.tmdb.imageBaseUrl}/${size}${path}`;
}

export function backdropUrl(
  path: string | null,
  size: "w780" | "w1280" | "original" = "w1280",
) {
  if (!path) return null;
  return `${config.tmdb.imageBaseUrl}/${size}${path}`;
}

export function stillUrl(
  path: string | null,
  size: "w185" | "w300" | "original" = "w300",
) {
  if (!path) return null;
  return `${config.tmdb.imageBaseUrl}/${size}${path}`;
}

export function profileUrl(
  path: string | null,
  size: "w185" | "h632" | "original" = "w185",
) {
  if (!path) return null;
  return `${config.tmdb.imageBaseUrl}/${size}${path}`;
}

export function imageUrl(
  path: string,
  size:
    | "w185"
    | "w300"
    | "w342"
    | "w500"
    | "w780"
    | "w1280"
    | "h632"
    | "original",
) {
  return `${config.tmdb.imageBaseUrl}/${size}${path}`;
}

export function movieSlug(movie: { id: number; title: string }) {
  const name = movie.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${name}-${movie.id}`;
}

export function movieHref(movie: { id: number; title: string }) {
  return `/movie/${movieSlug(movie)}`;
}

export function parseMovieIdFromSlug(slug: string): number | null {
  const match = slug.match(/-(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function tvSlug(show: { id: number; name: string }) {
  const name = show.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${name}-${show.id}`;
}

export function tvHref(show: { id: number; name: string }) {
  return `/tv/${tvSlug(show)}`;
}

export function parseTVIdFromSlug(slug: string): number | null {
  const match = slug.match(/-(\d+)$/);
  return match ? Number(match[1]) : null;
}

export interface TMDBPersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  also_known_as: string[];
  gender: number;
  homepage: string | null;
  combined_credits?: {
    cast: {
      id: number;
      media_type: "movie" | "tv";
      title?: string;
      name?: string;
      character: string;
      poster_path: string | null;
      backdrop_path: string | null;
      vote_average: number;
      release_date?: string;
      first_air_date?: string;
      popularity: number;
      vote_count: number;
      genre_ids: number[];
      /** Billing position; movies only. */
      order?: number;
      /** TV only. */
      episode_count?: number;
    }[];
    crew: {
      id: number;
      media_type: "movie" | "tv";
      title?: string;
      name?: string;
      job: string;
      department: string;
      poster_path: string | null;
      vote_average: number;
      release_date?: string;
      first_air_date?: string;
      popularity: number;
      vote_count: number;
      genre_ids: number[];
    }[];
  };
  external_ids?: {
    imdb_id: string | null;
    instagram_id: string | null;
    twitter_id: string | null;
  };
}

export async function getPersonDetails(id: number) {
  return cached(`person:${id}`, () =>
    tmdbFetch<TMDBPersonDetails>(`/person/${id}`, {
      append_to_response: "combined_credits,external_ids",
    }),
  );
}

export interface TMDBPersonMovieCrewCredit extends TMDBMovie {
  job: string;
  vote_count: number;
  /** True for direct-to-video releases such as music video compilations. */
  video: boolean;
}

export interface TMDBPersonMovieCastCredit extends TMDBMovie {
  character: string;
  /** Billing position, 0 for the lead. */
  order: number;
  vote_count: number;
  video: boolean;
}

export interface TMDBPersonMovieCredits {
  id: number;
  name: string;
  profile_path: string | null;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  movie_credits?: {
    cast: TMDBPersonMovieCastCredit[];
    crew: TMDBPersonMovieCrewCredit[];
  };
}

export async function getPersonMovieCredits(id: number) {
  return cached(`person:${id}:movie_credits`, () =>
    tmdbFetch<TMDBPersonMovieCredits>(`/person/${id}`, {
      append_to_response: "movie_credits",
    }),
  );
}

export interface TMDBPersonTVCastCredit extends TMDBTVShow {
  character: string;
  episode_count: number;
  vote_count: number;
}

export interface TMDBPersonTVCrewCredit extends TMDBTVShow {
  job: string;
  vote_count: number;
}

export interface TMDBPersonTVCredits {
  id: number;
  cast: TMDBPersonTVCastCredit[];
  crew: TMDBPersonTVCrewCredit[];
}

export async function getPersonTVCredits(id: number) {
  return cached(`person:${id}:tv_credits`, () =>
    tmdbFetch<TMDBPersonTVCredits>(`/person/${id}/tv_credits`),
  );
}

export function personSlug(person: { id: number; name: string }) {
  const name = person.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${name}-${person.id}`;
}

export function personHref(person: { id: number; name: string }) {
  return `/cast/${personSlug(person)}`;
}

export function parsePersonIdFromSlug(slug: string): number | null {
  const match = slug.match(/-(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function sampleTVShows(
  shows: TMDBTVShow[],
  count: number,
): TMDBTVShow[] {
  return shuffleArray(shows).slice(0, count);
}

export interface TMDBMultiSearchResult {
  id: number;
  media_type: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  popularity: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  profile_path?: string | null;
  known_for_department?: string;
  known_for?: {
    id: number;
    media_type: "movie" | "tv";
    title?: string;
    name?: string;
  }[];
}

interface TMDBMultiSearchResponse {
  page: number;
  results: TMDBMultiSearchResult[];
  total_pages: number;
  total_results: number;
}

export async function searchMulti(query: string, page = 1) {
  const q = query.trim();
  return cached(`search:multi:${q.toLowerCase()}:${page}`, () =>
    tmdbFetch<TMDBMultiSearchResponse>("/search/multi", {
      query: q,
      page: String(page),
      include_adult: "false",
    }),
  );
}

/** Smaller JSON for grid UIs (search cards do not use overview/backdrop). */
export function compactMediaItemForGrid(item: MediaItem): MediaItem {
  return {
    ...item,
    overview: "",
    backdrop_path: null,
  };
}

export function searchResultToMediaItem(
  r: TMDBMultiSearchResult,
): MediaItem | null {
  if (r.media_type === "movie") {
    return {
      id: r.id,
      title: r.title ?? "",
      overview: r.overview ?? "",
      poster_path: r.poster_path,
      backdrop_path: r.backdrop_path,
      vote_average: r.vote_average,
      popularity: r.popularity,
      releaseDate: r.release_date ?? "",
      href: movieHref({ id: r.id, title: r.title ?? "" }),
      mediaType: "movie",
    };
  }
  if (r.media_type === "tv") {
    return {
      id: r.id,
      title: r.name ?? "",
      overview: r.overview ?? "",
      poster_path: r.poster_path,
      backdrop_path: r.backdrop_path,
      vote_average: r.vote_average,
      popularity: r.popularity,
      releaseDate: r.first_air_date ?? "",
      href: tvHref({ id: r.id, name: r.name ?? "" }),
      mediaType: "tv",
    };
  }
  return null;
}

export type PersonItem = {
  id: number;
  name: string;
  profile_path: string | null;
  department: string;
  knownFor: string[];
  popularity?: number;
  href: string;
  mediaType: "person";
};

export type SearchItem = MediaItem | PersonItem;

export function isPersonItem(item: SearchItem): item is PersonItem {
  return item.mediaType === "person";
}

export function searchResultToPersonItem(
  r: TMDBMultiSearchResult,
): PersonItem | null {
  if (r.media_type !== "person") return null;
  const name = r.name ?? "";
  if (!name) return null;

  return {
    id: r.id,
    name,
    profile_path: r.profile_path ?? null,
    department: r.known_for_department ?? "",
    knownFor: (r.known_for ?? [])
      .map((credit) => credit.title ?? credit.name ?? "")
      .filter(Boolean)
      .slice(0, 3),
    popularity: r.popularity,
    href: personHref({ id: r.id, name }),
    mediaType: "person",
  };
}

/** Multi-search rows for the autocomplete dropdown: titles plus cast members. */
export function searchResultToSearchItem(
  r: TMDBMultiSearchResult,
): SearchItem | null {
  if (r.media_type === "person") return searchResultToPersonItem(r);
  const item = searchResultToMediaItem(r);
  return item ? compactMediaItemForGrid(item) : null;
}
