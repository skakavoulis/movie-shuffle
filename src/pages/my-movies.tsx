import { useEffect, useState } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { withAuth } from "@/components/AuthGuard";
import Layout from "@/components/Layout";
import LikeButton from "@/components/LikeButton";
import { posterUrl, movieHref } from "@/lib/tmdb";
import type { LikeRow } from "@/pages/api/likes";

export const getServerSideProps = withAuth(async () => ({
  props: {},
}));

export default function MyMovies() {
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/likes?media_type=movie")
      .then((r) => (r.ok ? r.json() : []))
      .then(setLikes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <Head>
        <title>My Movies — JustPickAMovie</title>
      </Head>

      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-24 pb-16">
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
          My Movies
        </h1>
        <p className="text-text-secondary mb-10">Movies you&apos;ve liked</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : likes.length === 0 ? (
          <div className="text-center py-20">
            <svg
              className="w-16 h-16 mx-auto text-text-muted mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <p className="text-text-secondary text-lg">No liked movies yet</p>
            <Link
              href="/"
              className="inline-block mt-4 px-6 py-2 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors"
            >
              Browse Movies
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {likes.map((like) => {
              const href = movieHref({ id: like.media_id, title: like.title });
              return (
                <div key={like.id} className="group relative">
                  <Link href={href}>
                    <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-bg-card shadow-lg transition-transform duration-300 group-hover:scale-105">
                      <Image
                        src={posterUrl(like.poster_path, "w342")}
                        alt={like.title}
                        fill
                        sizes="(max-width:640px) 50vw, (max-width:768px) 33vw, (max-width:1024px) 25vw, 16vw"
                        className="object-cover"
                      />
                    </div>
                  </Link>
                  <div className="absolute top-2 right-2 z-10 drop-shadow-lg">
                    <LikeButton
                      mediaType="movie"
                      mediaId={like.media_id}
                      title={like.title}
                      poster_path={like.poster_path}
                      size="md"
                    />
                  </div>
                  <Link href={href}>
                    <p className="mt-2 text-sm text-text-secondary truncate group-hover:text-text-primary transition-colors">
                      {like.title}
                    </p>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
