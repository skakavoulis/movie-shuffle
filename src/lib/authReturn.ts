/**
 * Where to send someone after they sign in. Kept in a cookie rather than the
 * OAuth redirect URL, which Supabase checks against an allow-list, and so it
 * also survives the magic-link email round trip in the same browser.
 */
export const AUTH_RETURN_COOKIE = "auth_return_to";

const MAX_AGE_SECONDS = 30 * 60;

/** Only same-site paths, so the cookie can't be used as an open redirect. */
export function safeReturnPath(value: string | undefined | null): string | null {
  if (!value) return null;
  let path: string;
  try {
    path = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return null;
  }
  return path;
}

/** Client side: return to `path` after the next sign-in. */
export function rememberReturnPath(path: string) {
  document.cookie = `${AUTH_RETURN_COOKIE}=${encodeURIComponent(path)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}
