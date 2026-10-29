export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    /**
     * Server only (no NEXT_PUBLIC_ prefix, so it's never sent to the browser).
     * Used for the server-side cache tables, which anon can't read or write.
     */
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
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
  guardian: {
    apiKey: process.env.GUARDIAN_API_KEY ?? "",
    baseUrl: "https://content.guardianapis.com",
  },
  mdblist: {
    apiKey: process.env.MDBLIST_API_KEY ?? "",
    baseUrl: "https://api.mdblist.com",
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY ?? "",
    baseUrl: "https://www.googleapis.com/youtube/v3",
  },
  motn: {
    apiKey: process.env.MOTN_API_KEY ?? "",
    baseUrl: "https://api.movieofthenight.com/v4",
  },
} as const;

export function assertServerConfig() {
  if (!config.tmdb.apiKey) {
    throw new Error("TMDB_API_KEY is not set in environment variables");
  }
}
