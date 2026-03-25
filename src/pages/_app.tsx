import type { AppProps } from "next/app";
import "@/styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LikesProvider } from "@/context/LikesContext";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { RegionProvider } from "@/context/RegionContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Hotjar from "@/components/Hotjar";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <RegionProvider>
        <LikesProvider>
          <WatchlistProvider>
            <Component {...pageProps} />
            <SpeedInsights />
            <Hotjar />
          </WatchlistProvider>
        </LikesProvider>
      </RegionProvider>
    </AuthProvider>
  );
}
