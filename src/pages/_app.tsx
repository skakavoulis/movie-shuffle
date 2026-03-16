import type { AppProps } from "next/app";
import "@/styles/globals.css";
import { LikesProvider } from "@/context/LikesContext";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { RegionProvider } from "@/context/RegionContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Hotjar from "@/components/Hotjar";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <RegionProvider>
      <LikesProvider user={pageProps.user ?? null}>
        <WatchlistProvider user={pageProps.user ?? null}>
          <Component {...pageProps} />
          <SpeedInsights />
          <Hotjar />
        </WatchlistProvider>
      </LikesProvider>
    </RegionProvider>
  );
}
