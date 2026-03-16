import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import {
  searchMulti,
  searchResultToMediaItem,
  posterUrl,
  type MediaItem,
} from "@/lib/tmdb";
import Layout from "@/components/Layout";

interface SearchPageProps {
  user: User | null;
  query: string;
  results: MediaItem[];
  totalResults: number;
}

export const getServerSideProps: GetServerSideProps<SearchPageProps> = async (
  context,
) => {
  const supabase = createServerSupabaseClient(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const query = ((context.query.q as string) ?? "").trim();

  if (!query) {
    return { props: { user, query: "", results: [], totalResults: 0 } };
  }

  try {
    const data = await searchMulti(query);
    const results = data.results
      .map(searchResultToMediaItem)
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      props: {
        user,
        query,
        results,
        totalResults: data.total_results,
      },
    };
  } catch {
    return { props: { user, query, results: [], totalResults: 0 } };
  }
};

export default function SearchPage({
  user,
  query,
  results,
  totalResults,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <Layout user={user}>
      <Head>
        <title>
          {query
            ? `"${query}" — Search — JustPickAMovie`
            : "Search — JustPickAMovie"}
        </title>
      </Head>

      <div className="min-h-screen pt-24 px-6 md:px-12 max-w-7xl mx-auto">
        {!query ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <svg
              className="w-16 h-16 text-text-muted mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Search Movies & TV Shows
            </h1>
            <p className="text-text-secondary text-sm">
              Use the search bar above to find your favorites
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
                Results for &ldquo;{query}&rdquo;
              </h1>
              <p className="text-sm text-text-muted mt-1">
                {totalResults} {totalResults === 1 ? "result" : "results"} found
              </p>
            </div>

            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
                <svg
                  className="w-16 h-16 text-text-muted mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-text-secondary">
                  No movies or TV shows found for &ldquo;{query}&rdquo;
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {results.map((item) => {
                  const year = item.releaseDate?.split("-")[0];
                  const rating = item.vote_average?.toFixed(1);

                  return (
                    <Link
                      key={`${item.mediaType}-${item.id}`}
                      href={item.href}
                      className="group transition-transform duration-300 hover:scale-105"
                    >
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-bg-card shadow-lg">
                        <Image
                          src={posterUrl(item.poster_path, "w342")}
                          alt={item.title}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                          className="object-cover transition-opacity group-hover:opacity-80"
                        />
                        {item.mediaType && (
                          <span
                            className={`absolute top-2 left-2 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded backdrop-blur-sm ${
                              item.mediaType === "movie"
                                ? "bg-accent/80 text-white"
                                : "bg-blue-500/80 text-white"
                            }`}
                          >
                            {item.mediaType === "movie" ? "Movie" : "TV"}
                          </span>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="flex items-center gap-2 text-xs text-text-secondary">
                            {rating && Number(rating) > 0 && (
                              <span className="flex items-center gap-1 text-yellow-400">
                                <svg
                                  className="w-3 h-3"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {rating}
                              </span>
                            )}
                            {year && <span>{year}</span>}
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-text-secondary truncate group-hover:text-text-primary transition-colors">
                        {item.title}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
