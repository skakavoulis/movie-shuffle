import type { TMDBMovie, TMDBTVShow } from "@/lib/tmdb";

export type DiscoverMediaType = "movie" | "tv";

export type DiscoverSlimMovie = Pick<
  TMDBMovie,
  | "id"
  | "title"
  | "overview"
  | "poster_path"
  | "release_date"
  | "vote_average"
  | "genre_ids"
>;

export type DiscoverSlimTV = Pick<
  TMDBTVShow,
  | "id"
  | "name"
  | "overview"
  | "poster_path"
  | "first_air_date"
  | "vote_average"
  | "genre_ids"
>;

export type DiscoverItem = DiscoverSlimMovie | DiscoverSlimTV;

export function isMovie(item: DiscoverItem): item is DiscoverSlimMovie {
  return "title" in item && "release_date" in item;
}

export function mediaLabel(mediaType: DiscoverMediaType): string {
  return mediaType === "movie" ? "movies" : "shows";
}

export const MOVIE_GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

export const TV_GENRE_MAP: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};
