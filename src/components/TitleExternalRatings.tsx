import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ExternalRatings from "@/components/ExternalRatings";
import type { ExternalRatings as ExternalRatingsData } from "@/lib/ratings";

type Props = {
  mediaType: "movie" | "tv";
  mediaId: number;
};

type Fetched = {
  requestKey: string;
  ratings: ExternalRatingsData | null;
};

export default function TitleExternalRatings({ mediaType, mediaId }: Props) {
  const { user } = useAuth();
  // Null while signed out, which both skips the fetch and hides stale pills.
  const requestKey = user ? `${mediaType}:${mediaId}:${user.id}` : null;
  const [fetched, setFetched] = useState<Fetched | null>(null);

  useEffect(() => {
    if (!requestKey) return;

    let cancelled = false;
    const q = new URLSearchParams({ mediaType, id: String(mediaId) });
    fetch(`/api/external-ratings?${q}`)
      .then((r) => (r.ok ? r.json() : { ratings: null }))
      .then((data: { ratings?: ExternalRatingsData | null }) => {
        if (!cancelled)
          setFetched({ requestKey, ratings: data.ratings ?? null });
      })
      .catch(() => {
        if (!cancelled) setFetched({ requestKey, ratings: null });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, mediaType, mediaId]);

  const ratings =
    fetched && fetched.requestKey === requestKey ? fetched.ratings : null;

  return <ExternalRatings ratings={ratings} />;
}
