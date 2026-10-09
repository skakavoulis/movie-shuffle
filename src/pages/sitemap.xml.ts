import type { GetServerSideProps } from "next";
import {
  getPopularMovies,
  getTrendingMovies,
  getTopRatedMovies,
  getPopularTVShows,
  getTrendingTVShows,
  movieHref,
  tvHref,
} from "@/lib/tmdb";
import { CDN_LONG } from "@/lib/cdnCache";
import { siteUrl } from "@/lib/site";

const STATIC_PATHS = ["/", "/tv-shows", "/discover", "/great-creators"];

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Lists the landing pages plus the titles currently featured on them, so
 * crawlers can reach popular detail pages without following carousels.
 */
async function titlePaths(): Promise<string[]> {
  try {
    const [popular, trending, topRated, popularTV, trendingTV] =
      await Promise.all([
        getPopularMovies(),
        getTrendingMovies(),
        getTopRatedMovies(),
        getPopularTVShows(),
        getTrendingTVShows(),
      ]);
    return [
      ...[...popular.results, ...trending.results, ...topRated.results].map(
        movieHref,
      ),
      ...[...popularTV.results, ...trendingTV.results].map(tvHref),
    ];
  } catch {
    return [];
  }
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const origin = siteUrl();
  const paths = [...new Set([...STATIC_PATHS, ...(await titlePaths())])];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${escapeXml(`${origin}${p}`)}</loc></url>`).join("\n")}
</urlset>
`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", CDN_LONG);
  res.end(xml);
  return { props: {} };
};

export default function Sitemap() {
  return null;
}
