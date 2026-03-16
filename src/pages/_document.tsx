import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta
          name="description"
          content="JustPickAMovie — Discover random movies with a beautiful streaming-style interface. Powered by TMDB."
        />
        <meta property="og:title" content="JustPickAMovie" />
        <meta
          property="og:description"
          content="Discover random movies with a streaming-style interface."
        />
        <meta property="og:type" content="website" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
