export const SITE_NAME = "JustPickAMovie";

/**
 * Absolute origin used for canonical URLs, Open Graph tags and the sitemap.
 * Server-only: pass the result to pages through props so the server and
 * client render the same value.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
