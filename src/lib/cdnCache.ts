/** Cache-Control values for CDN (s-maxage); lowers Fast Origin Transfer via edge hits. */
export const CDN_LONG = "public, s-maxage=86400, stale-while-revalidate=604800"; // 1 day
export const CDN_MEDIUM = "public, s-maxage=3600, stale-while-revalidate=86400"; // 1 hour
export const CDN_SEARCH_HTML = "public, s-maxage=600, stale-while-revalidate=86400"; // 10 minutes
