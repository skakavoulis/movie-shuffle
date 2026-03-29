export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
  tmdb: {
    apiKey: process.env.TMDB_API_KEY ?? "",
    baseUrl: "https://api.themoviedb.org/3",
    imageBaseUrl: "https://image.tmdb.org/t/p",
  },
  gnews: {
    apiKey: process.env.GNEWS_API_KEY ?? "",
    baseUrl: "https://gnews.io/api/v4",
  },
} as const;

export function assertServerConfig() {
  if (!config.tmdb.apiKey) {
    throw new Error("TMDB_API_KEY is not set in environment variables");
  }
}
