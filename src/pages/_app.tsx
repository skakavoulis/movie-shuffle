import type { AppProps } from "next/app";
import "@/styles/globals.css";
import { LikesProvider } from "@/context/LikesContext";
import { WatchlistProvider } from "@/context/WatchlistContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LikesProvider user={pageProps.user ?? null}>
      <WatchlistProvider user={pageProps.user ?? null}>
        <Component {...pageProps} />
      </WatchlistProvider>
    </LikesProvider>
  );
}
