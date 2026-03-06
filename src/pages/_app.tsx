import type { AppProps } from "next/app";
import "@/styles/globals.css";
import { LikesProvider } from "@/context/LikesContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LikesProvider user={pageProps.user ?? null}>
      <Component {...pageProps} />
    </LikesProvider>
  );
}
