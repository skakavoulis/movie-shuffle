import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Server side of the human check. A visitor proves once, with an invisible
 * Cloudflare Turnstile challenge, that they're a browser driven by a person;
 * /api/verify then sets a short-lived signed cookie. API routes that cost us
 * something per title (Supabase, Redis, Wikidata, YouTube, Streaming
 * Availability) only answer requests carrying a valid cookie, so scrapers that
 * fail the challenge get the bare TMDB page and nothing else.
 *
 * Without TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY the check is
 * off and every request counts as verified, so local dev and previews without
 * keys keep working.
 */

/** HttpOnly proof the server checks. */
export const HUMAN_COOKIE = "jpam_hv";
/** Readable copy of the expiry, so the browser knows when to re-verify. */
export const HUMAN_HINT_COOKIE = "jpam_hv_until";
/** How long one passed challenge is trusted. */
export const HUMAN_COOKIE_TTL_SECONDS = 30 * 60;
/** Header on 401s from gated routes, telling the client to re-verify. */
export const HUMAN_CHECK_HEADER = "X-Human-Check";

const COOKIE_VERSION = "v1";

const secretKey = process.env.TURNSTILE_SECRET_KEY ?? "";
const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function humanCheckEnabled() {
  return Boolean(secretKey && siteKey);
}

export function turnstileSecretKey() {
  return secretKey;
}

let warned = false;
function warnDisabled() {
  if (warned) return;
  warned = true;
  console.warn(
    "[humanCheck] TURNSTILE_SECRET_KEY / NEXT_PUBLIC_TURNSTILE_SITE_KEY are not set; the human check is off and gated routes answer everyone",
  );
}

/** Derived so the Turnstile secret itself is never used as a MAC key. */
function signingKey() {
  return createHmac("sha256", secretKey)
    .update("jpam-human-cookie-v1")
    .digest();
}

/**
 * Ties a cookie to the browser that earned it, so a scraper can't solve one
 * challenge and replay the cookie from a fleet with other user agents.
 */
function userAgentHash(req: NextApiRequest) {
  return createHash("sha256")
    .update(req.headers["user-agent"] ?? "")
    .digest("base64url")
    .slice(0, 16);
}

function sign(payload: string) {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

function readCookie(req: NextApiRequest, name: string) {
  const raw = req.headers.cookie ?? "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function isVerifiedHuman(req: NextApiRequest): boolean {
  if (!humanCheckEnabled()) {
    warnDisabled();
    return true;
  }

  const value = readCookie(req, HUMAN_COOKIE);
  if (!value) return false;

  const [version, exp, ua, sig] = value.split(".");
  if (version !== COOKIE_VERSION || !exp || !ua || !sig) return false;
  if (!/^\d+$/.test(exp) || Number(exp) * 1000 <= Date.now()) return false;
  if (ua !== userAgentHash(req)) return false;

  const expected = Buffer.from(sign(`${version}.${exp}.${ua}`));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * For gated API routes: answers 401 and returns false unless the request
 * carries a valid cookie. The 401 is never cached, so a CDN can't serve it to
 * a verified visitor later.
 */
export function requireHuman(req: NextApiRequest, res: NextApiResponse) {
  if (isVerifiedHuman(req)) return true;
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader(HUMAN_CHECK_HEADER, "required");
  res.status(401).json({ error: "Human check required" });
  return false;
}

export function issueHumanCookie(req: NextApiRequest, res: NextApiResponse) {
  const exp = Math.floor(Date.now() / 1000) + HUMAN_COOKIE_TTL_SECONDS;
  const payload = `${COOKIE_VERSION}.${exp}.${userAgentHash(req)}`;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const common = `Path=/; Max-Age=${HUMAN_COOKIE_TTL_SECONDS}; SameSite=Lax${secure}`;
  res.setHeader("Set-Cookie", [
    `${HUMAN_COOKIE}=${payload}.${sign(payload)}; ${common}; HttpOnly`,
    `${HUMAN_HINT_COOKIE}=${exp}; ${common}`,
  ]);
}
