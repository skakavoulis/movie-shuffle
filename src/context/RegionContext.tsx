import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/router";

const STORAGE_KEY = "watch-region";
const COOKIE_NAME = "watch-region";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

export interface RegionOption {
  iso_3166_1: string;
  english_name: string;
  native_name: string;
}

interface RegionContextValue {
  region: string;
  setRegion: (region: string) => void;
  regions: RegionOption[];
  loading: boolean;
}

const RegionContext = createContext<RegionContextValue>({
  region: "US",
  setRegion: () => {},
  regions: [],
  loading: true,
});

function detectRegionFromBrowser(): string {
  if (typeof window === "undefined") return "US";
  const langs = navigator.languages ?? [navigator.language];
  for (const lang of langs) {
    const match = lang.match(/^[a-z]{2}-([A-Z]{2})$/i);
    if (match) return match[1].toUpperCase();
  }
  return "US";
}

function loadStoredRegion(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setRegionCookie(region: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${region}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function RegionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [region, setRegionState] = useState("US");
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = loadStoredRegion();
    if (stored) {
      setRegionState(stored);
    } else {
      const detected = detectRegionFromBrowser();
      setRegionState(detected);
      localStorage.setItem(STORAGE_KEY, detected);
      setRegionCookie(detected);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/regions")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: RegionOption[]) => {
        if (!cancelled) setRegions(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setRegion = useCallback(
    (newRegion: string) => {
      setRegionState(newRegion);
      try {
        localStorage.setItem(STORAGE_KEY, newRegion);
      } catch {}
      setRegionCookie(newRegion);
      router.replace(router.asPath);
    },
    [router]
  );

  return (
    <RegionContext.Provider
      value={{ region, setRegion, regions, loading }}
    >
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  return useContext(RegionContext);
}
