import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import type { WatchlistRow, WatchlistStatus } from "@/pages/api/watchlist";

interface WatchlistContextValue {
  watchlistMap: Map<string, WatchlistStatus>;
  getStatus: (
    mediaType: "movie" | "tv",
    mediaId: number
  ) => WatchlistStatus | null;
  setWatchlistStatus: (item: {
    mediaType: "movie" | "tv";
    mediaId: number;
    title: string;
    poster_path: string | null;
    status: WatchlistStatus;
  }) => Promise<void>;
  removeFromWatchlist: (item: {
    mediaType: "movie" | "tv";
    mediaId: number;
  }) => Promise<void>;
  loading: boolean;
}

const WatchlistContext = createContext<WatchlistContextValue>({
  watchlistMap: new Map(),
  getStatus: () => null,
  setWatchlistStatus: async () => {},
  removeFromWatchlist: async () => {},
  loading: false,
});

function watchlistKey(mediaType: string, mediaId: number) {
  return `${mediaType}:${mediaId}`;
}

export function WatchlistProvider({
  user,
  children,
}: {
  user: User | null;
  children: ReactNode;
}) {
  const [watchlistMap, setWatchlistMap] = useState<Map<string, WatchlistStatus>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setWatchlistMap(new Map());
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/watchlist")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: WatchlistRow[]) => {
        if (cancelled) return;
        const map = new Map<string, WatchlistStatus>();
        for (const r of rows) {
          map.set(watchlistKey(r.media_type, r.media_id), r.status);
        }
        setWatchlistMap(map);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const getStatus = useCallback(
    (mediaType: "movie" | "tv", mediaId: number) =>
      watchlistMap.get(watchlistKey(mediaType, mediaId)) ?? null,
    [watchlistMap]
  );

  const setWatchlistStatus = useCallback(
    async (item: {
      mediaType: "movie" | "tv";
      mediaId: number;
      title: string;
      poster_path: string | null;
      status: WatchlistStatus;
    }) => {
      if (!user) return;
      const key = watchlistKey(item.mediaType, item.mediaId);
      const prevStatus = watchlistMap.get(key) ?? null;

      setWatchlistMap((prev) => {
        const next = new Map(prev);
        next.set(key, item.status);
        return next;
      });

      try {
        await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media_id: item.mediaId,
            media_type: item.mediaType,
            title: item.title,
            poster_path: item.poster_path,
            status: item.status,
          }),
        });
      } catch {
        setWatchlistMap((prev) => {
          const rollback = new Map(prev);
          if (prevStatus) rollback.set(key, prevStatus);
          else rollback.delete(key);
          return rollback;
        });
      }
    },
    [user, watchlistMap]
  );

  const removeFromWatchlist = useCallback(
    async (item: { mediaType: "movie" | "tv"; mediaId: number }) => {
      if (!user) return;
      const key = watchlistKey(item.mediaType, item.mediaId);
      const prevStatus = watchlistMap.get(key) ?? null;

      setWatchlistMap((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });

      try {
        await fetch(
          `/api/watchlist?media_id=${item.mediaId}&media_type=${item.mediaType}`,
          { method: "DELETE" }
        );
      } catch {
        if (prevStatus) {
          setWatchlistMap((prev) => {
            const rollback = new Map(prev);
            rollback.set(key, prevStatus);
            return rollback;
          });
        }
      }
    },
    [user, watchlistMap]
  );

  return (
    <WatchlistContext.Provider
      value={{
        watchlistMap,
        getStatus,
        setWatchlistStatus,
        removeFromWatchlist,
        loading,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}
