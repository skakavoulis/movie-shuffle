import { useEffect, useState } from "react";
import { useRegion } from "@/context/RegionContext";
import WatchProvidersSection from "@/components/WatchProvidersSection";
import type { TMDBWatchProviderOffer } from "@/lib/tmdb";

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
  const [offer, setOffer] = useState<TMDBWatchProviderOffer | null>(null);

  useEffect(() => {
    let cancelled = false;
    const q = new URLSearchParams({
      mediaType,
      id: String(mediaId),
      region,
    });
    fetch(`/api/title-watch-providers?${q}`)
      .then((r) => (r.ok ? r.json() : { offer: null }))
      .then((data: { offer?: TMDBWatchProviderOffer | null }) => {
        if (!cancelled) setOffer(data.offer ?? null);
      })
      .catch(() => {
        if (!cancelled) setOffer(null);
      });
    return () => {
      cancelled = true;
    };
  }, [mediaType, mediaId, region]);

  return <WatchProvidersSection offer={offer} title={title} />;
}
