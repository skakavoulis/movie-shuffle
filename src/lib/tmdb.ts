import { config, assertServerConfig } from "./config";

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
  return tmdbFetch<TMDBListResponse>("/movie/popular", { page: String(page) });
}

export async function getTopRatedMovies(page = 1) {
  return tmdbFetch<TMDBListResponse>("/movie/top_rated", {
    page: String(page),
  });
}

export async function getNowPlayingMovies(page = 1) {
  return tmdbFetch<TMDBListResponse>("/movie/now_playing", {
    page: String(page),
  });
}

export async function getTrendingMovies() {
  return tmdbFetch<TMDBListResponse>("/trending/movie/week");
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
