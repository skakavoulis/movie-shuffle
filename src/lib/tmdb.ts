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
  credits?: {
    cast: TMDBCastMember[];
    crew: TMDBCrewMember[];
  };
  videos?: {
    results: TMDBVideo[];
  };
  similar?: {
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
      append_to_response: "credits,videos,similar,reviews",
    }),
  );
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

export async function getTVShowDetails(id: number) {
  return cached(`tv:${id}`, () =>
    tmdbFetch<TMDBTVShowDetails>(`/tv/${id}`, {
      append_to_response: "credits,videos,similar,reviews",
    }),
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

export function profileUrl(
  path: string | null,
  size: "w185" | "h632" | "original" = "w185",
) {
  if (!path) return null;
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
}

interface TMDBMultiSearchResponse {
  page: number;
  results: TMDBMultiSearchResult[];
  total_pages: number;
  total_results: number;
}

export async function searchMulti(query: string, page = 1) {
  return tmdbFetch<TMDBMultiSearchResponse>("/search/multi", {
    query,
    page: String(page),
    include_adult: "false",
  });
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
