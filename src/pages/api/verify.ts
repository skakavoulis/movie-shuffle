import type { NextApiRequest, NextApiResponse } from "next";
import {
  humanCheckEnabled,
  isVerifiedHuman,
  issueHumanCookie,
  turnstileSecretKey,
} from "@/lib/humanCheck";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SITEVERIFY_TIMEOUT_MS = 5000;
/** Must match the `action` the client renders the widget with. */
export const TURNSTILE_ACTION = "page";

interface SiteverifyResult {
  success: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
}

function clientIp(req: NextApiRequest) {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
    ?.split(",")[0]
    ?.trim();
  return first || req.socket.remoteAddress || "";
}

/** Rejects cross-site posts, so another page can't mint cookies for itself. */
function isSameOrigin(req: NextApiRequest) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

/**
 * Exchanges a Turnstile token for the signed human cookie. Answers 204 when
 * the visitor is (or already was) verified, 403 when the challenge failed.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "private, no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!humanCheckEnabled()) return res.status(204).end();
  if (!isSameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  if (isVerifiedHuman(req)) return res.status(204).end();

  const token = (req.body as { token?: unknown } | undefined)?.token;
  if (typeof token !== "string" || !token || token.length > 2048) {
    return res.status(400).json({ error: "Missing token" });
  }

  let result: SiteverifyResult;
  try {
    const r = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({
        secret: turnstileSecretKey(),
        response: token,
        remoteip: clientIp(req),
      }),
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
    });
    result = (await r.json()) as SiteverifyResult;
  } catch (e) {
    console.error(
      "[verify] Turnstile siteverify failed:",
      e instanceof Error ? e.message : e,
    );
    return res.status(503).json({ error: "Verification unavailable" });
  }

  // Cloudflare's test keys report action "test", so only enforce ours when
  // the response carries a real one.
  const actionOk =
    !result.action ||
    result.action === TURNSTILE_ACTION ||
    result.action === "test";
  if (!result.success || !actionOk) {
    return res.status(403).json({ error: "Verification failed" });
  }

  issueHumanCookie(req, res);
  return res.status(204).end();
}
