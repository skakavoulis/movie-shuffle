import { useEffect, useState } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import type { User } from "@supabase/supabase-js";
import { withAuth } from "@/components/AuthGuard";
import Layout from "@/components/Layout";
import WatchlistButton from "@/components/WatchlistButton";
import { posterUrl, movieHref, tvHref } from "@/lib/tmdb";
import type { WatchlistRow, WatchlistStatus } from "@/pages/api/watchlist";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

type WatchlistPageProps = {
  user: User | null;
  [key: string]: unknown;
};

export const getServerSideProps: GetServerSideProps<WatchlistPageProps> =
  withAuth(async (context, _userId) => {
    const supabase = createServerSupabaseClient(context);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return { props: { user } };
  });

const tabs: { key: WatchlistStatus; label: string }[] = [
  { key: "want_to_watch", label: "Want to Watch" },
  { key: "watched", label: "Watched" },
];

function itemHref(item: WatchlistRow) {
  if (item.media_type === "movie") {
    return movieHref({ id: item.media_id, title: item.title });
  }
  return tvHref({ id: item.media_id, name: item.title });
}

export default function WatchlistPage({
  user,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [items, setItems] = useState<WatchlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<WatchlistStatus>("want_to_watch");

  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = items.filter((i) => i.status === activeTab);

  return (
    <Layout user={user}>
      <Head>
        <title>Watchlist — MovieShuffle</title>
      </Head>

      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-24 pb-16">
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
          Watchlist
        </h1>
        <p className="text-text-secondary mb-8">
          Track what you want to watch and what you&apos;ve already seen
        </p>

        {/* Tabs */}
        <div className="flex gap-1 mb-10 bg-bg-card rounded-lg p-1 w-fit">
          {tabs.map((tab) => {
            const count = items.filter((i) => i.status === tab.key).length;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 rounded-md text-sm font-medium transition-all ${
                  isActive
                    ? "bg-accent text-white shadow-md"
                    : "text-text-secondary hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                      isActive
                        ? "bg-white/20"
                        : "bg-white/5 text-text-muted"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
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
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            <p className="text-text-secondary text-lg">
              {activeTab === "want_to_watch"
                ? "No movies or shows in your watchlist yet"
                : "You haven't marked anything as watched yet"}
            </p>
            <Link
              href="/"
              className="inline-block mt-4 px-6 py-2 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors"
            >
              Browse Movies
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {filteredItems.map((item) => {
              const href = itemHref(item);
              return (
                <div key={item.id} className="group relative">
                  <Link href={href}>
                    <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-bg-card shadow-lg transition-transform duration-300 group-hover:scale-105">
                      <Image
                        src={posterUrl(item.poster_path, "w342")}
                        alt={item.title}
                        fill
                        sizes="(max-width:640px) 50vw, (max-width:768px) 33vw, (max-width:1024px) 25vw, 16vw"
                        className="object-cover"
                      />
                      <div className="absolute top-2 left-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.media_type === "movie"
                              ? "bg-accent/80 text-white"
                              : "bg-blue-500/80 text-white"
                          }`}
                        >
                          {item.media_type === "movie" ? "Movie" : "TV"}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div className="absolute top-2 right-2 z-10 drop-shadow-lg">
                    <WatchlistButton
                      mediaType={item.media_type}
                      mediaId={item.media_id}
                      title={item.title}
                      poster_path={item.poster_path}
                      size="md"
                    />
                  </div>
                  <Link href={href}>
                    <p className="mt-2 text-sm text-text-secondary truncate group-hover:text-text-primary transition-colors">
                      {item.title}
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
