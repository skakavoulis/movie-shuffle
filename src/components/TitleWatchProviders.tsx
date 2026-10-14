import { useEffect, useState } from "react";
import { useRegion } from "@/context/RegionContext";
import WatchProvidersButton from "@/components/WatchProvidersButton";
import type { WatchOffer } from "@/lib/providerUrls";

type Props = {
  mediaType: "movie" | "tv";
  mediaId: number;
  title: string;
};

export default function TitleWatchProviders({
  mediaType,
  mediaId,
  title,
}: Props) {
  const { region } = useRegion();
  const query = new URLSearchParams({
    mediaType,
    id: String(mediaId),
    region,
    title,
  }).toString();
  // Remember which query the offer belongs to, so a new title or region
  // shows the loading state until its own response arrives.
  const [result, setResult] = useState<{
    query: string;
    offer: WatchOffer | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/title-watch-providers?${query}`)
      .then((r) => (r.ok ? r.json() : { offer: null }))
      .then((data: { offer?: WatchOffer | null }) => {
        if (!cancelled) setResult({ query, offer: data.offer ?? null });
      })
      .catch(() => {
        if (!cancelled) setResult({ query, offer: null });
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const loading = result?.query !== query;
  return (
    <WatchProvidersButton
      offer={loading ? null : result.offer}
      loading={loading}
    />
  );
}
