import type { AppProps } from "next/app";
import "@/styles/globals.css";
import { LikesProvider } from "@/context/LikesContext";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LikesProvider user={pageProps.user ?? null}>
      <WatchlistProvider user={pageProps.user ?? null}>
        <Component {...pageProps} />
        <SpeedInsights />
      </WatchlistProvider>
    </LikesProvider>
  );
}
