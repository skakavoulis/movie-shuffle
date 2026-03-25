import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { LikeRow } from "@/pages/api/likes";
import { useAuth } from "@/context/AuthContext";

interface LikesContextValue {
  likedIds: Set<string>;
  isLiked: (mediaType: "movie" | "tv", mediaId: number) => boolean;
  toggleLike: (item: {
    mediaType: "movie" | "tv";
    mediaId: number;
    title: string;
    poster_path: string | null;
  }) => Promise<void>;
  loading: boolean;
}

const LikesContext = createContext<LikesContextValue>({
  likedIds: new Set(),
  isLiked: () => false,
  toggleLike: async () => {},
  loading: false,
});

function likeKey(mediaType: string, mediaId: number) {
  return `${mediaType}:${mediaId}`;
}

export function LikesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setLikedIds(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/likes")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: LikeRow[]) => {
        if (cancelled) return;
        setLikedIds(new Set(rows.map((r) => likeKey(r.media_type, r.media_id))));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isLiked = useCallback(
    (mediaType: "movie" | "tv", mediaId: number) =>
      likedIds.has(likeKey(mediaType, mediaId)),
    [likedIds]
  );

  const toggleLike = useCallback(
    async (item: {
      mediaType: "movie" | "tv";
      mediaId: number;
      title: string;
      poster_path: string | null;
    }) => {
      if (!user) return;
      const key = likeKey(item.mediaType, item.mediaId);
      const wasLiked = likedIds.has(key);

      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(key);
        else next.add(key);
        return next;
      });

      try {
        if (wasLiked) {
          await fetch(
            `/api/likes?media_id=${item.mediaId}&media_type=${item.mediaType}`,
            { method: "DELETE" }
          );
        } else {
          await fetch("/api/likes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              media_id: item.mediaId,
              media_type: item.mediaType,
              title: item.title,
              poster_path: item.poster_path,
            }),
          });
        }
      } catch {
        setLikedIds((prev) => {
          const rollback = new Set(prev);
          if (wasLiked) rollback.add(key);
          else rollback.delete(key);
          return rollback;
        });
      }
    },
    [user, likedIds]
  );

  return (
    <LikesContext.Provider value={{ likedIds, isLiked, toggleLike, loading }}>
      {children}
    </LikesContext.Provider>
  );
}

export function useLikes() {
  return useContext(LikesContext);
}
