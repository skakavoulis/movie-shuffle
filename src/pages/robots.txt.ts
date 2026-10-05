import type { GetServerSideProps } from "next";
import { CDN_LONG } from "@/lib/cdnCache";
import { siteUrl } from "@/lib/site";

/** Served from a route rather than public/ so the Sitemap line can be absolute. */
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const body = `User-agent: *
Allow: /
Crawl-delay: 10

# Personalized or auth-gated pages — nothing useful to index.
Disallow: /auth
Disallow: /profile
Disallow: /my-movies
Disallow: /my-tv-shows
Disallow: /watchlist

# Person pages: a very large URL space that crawlers walk exhaustively.
Disallow: /cast/

# Unbounded query-string spaces.
Disallow: /api/
Disallow: /search

Sitemap: ${siteUrl()}/sitemap.xml
`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", CDN_LONG);
  res.end(body);
  return { props: {} };
};

export default function Robots() {
  return null;
}
