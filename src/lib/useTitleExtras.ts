import { useEffect, useState } from "react";
import { humanFetch } from "./humanFetch";
import type { TitleExtras } from "@/pages/api/title-extras";

const EMPTY: TitleExtras = { facts: null, franchise: null, doubleFeature: null };

/**
 * Loads a title's Wikidata facts (and, for TV, its franchise and double
 * feature) after the human check. Empty until they arrive, and stays empty
 * when the visitor can't be verified or the request fails.
 */
export function useTitleExtras(mediaType: "movie" | "tv", id: number) {
  const key = `${mediaType}:${id}`;
  const [result, setResult] = useState<{ key: string; extras: TitleExtras }>({
    key: "",
    extras: EMPTY,
  });

  useEffect(() => {
    let cancelled = false;
    const q = new URLSearchParams({ mediaType, id: String(id) });
    humanFetch(`/api/title-extras?${q}`)
      .then((r) => (r.ok ? r.json() : EMPTY))
      .then((extras: TitleExtras) => {
        if (!cancelled) setResult({ key, extras });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, extras: EMPTY });
      });
    return () => {
      cancelled = true;
    };
  }, [key, mediaType, id]);

  // Another title's extras never show while this one loads.
  return result.key === key ? result.extras : EMPTY;
}
