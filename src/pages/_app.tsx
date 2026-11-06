import type { AppProps } from "next/app";
import { Analytics } from "@vercel/analytics/next";
import "@/styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LikesProvider } from "@/context/LikesContext";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { RegionProvider } from "@/context/RegionContext";
import Hotjar from "@/components/Hotjar";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <RegionProvider>
        <LikesProvider>
          <WatchlistProvider>
            <Component {...pageProps} />
            <Hotjar />
            {/* Vercel Web Analytics: page views of browsers that run the page
                script, so most scraper hits (plain HTML fetches) aren't counted. */}
            <Analytics />
          </WatchlistProvider>
        </LikesProvider>
      </RegionProvider>
    </AuthProvider>
  );
}
