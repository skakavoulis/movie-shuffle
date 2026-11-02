/**
 * Browser side of the human check (see humanCheck.ts). `humanFetch` is a drop-in
 * for `fetch` on gated API routes: it first makes sure this browser holds a
 * valid human cookie, running the invisible Turnstile challenge when it
 * doesn't, and retries once if the server says the cookie has lapsed.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
/** Keep in sync with HUMAN_HINT_COOKIE and TURNSTILE_ACTION on the server. */
const HINT_COOKIE = "jpam_hv_until";
const ACTION = "page";
/** Re-verify a little before the cookie actually expires. */
const EXPIRY_MARGIN_SECONDS = 30;

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      appearance?: "always" | "execute" | "interaction-only";
      callback?: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
      "timeout-callback"?: () => void;
    },
  ): string | undefined;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let pending: Promise<void> | null = null;
let scriptLoad: Promise<TurnstileApi> | null = null;

function hintValid() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${HINT_COOKIE}=(\\d+)`));
  return (
    !!match && Number(match[1]) - EXPIRY_MARGIN_SECONDS > Date.now() / 1000
  );
}

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptLoad) return scriptLoad;
  scriptLoad = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () =>
      window.turnstile
        ? resolve(window.turnstile)
        : reject(new Error("Turnstile failed to initialise"));
    script.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(script);
  }).catch((e) => {
    scriptLoad = null;
    throw e;
  });
  return scriptLoad;
}

/**
 * Solves one challenge and returns its token. The widget stays invisible
 * unless Cloudflare wants an interaction, in which case it shows in the
 * corner.
 */
async function solveChallenge(): Promise<string> {
  const turnstile = await loadTurnstile();
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;right:16px;bottom:16px;z-index:9999;";
  document.body.appendChild(container);

  return new Promise<string>((resolve, reject) => {
    // Set once render returns; a callback that fires first just skips it.
    const widget: { id?: string } = {};
    const done = () => {
      if (widget.id) turnstile.remove(widget.id);
      container.remove();
    };
    widget.id = turnstile.render(container, {
      sitekey: SITE_KEY,
      action: ACTION,
      appearance: "interaction-only",
      callback: (token) => {
        done();
        resolve(token);
      },
      "error-callback": () => {
        done();
        reject(new Error("Turnstile challenge failed"));
      },
      "timeout-callback": () => {
        done();
        reject(new Error("Turnstile challenge timed out"));
      },
    });
  });
}

async function verify(): Promise<void> {
  const token = await solveChallenge();
  const r = await fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
    credentials: "same-origin",
  });
  if (!r.ok) throw new Error(`Verification failed (${r.status})`);
}

/** Resolves once this browser holds a valid human cookie. */
export function ensureHuman(): Promise<void> {
  if (!SITE_KEY || typeof window === "undefined") return Promise.resolve();
  if (hintValid()) return Promise.resolve();
  if (!pending) {
    pending = verify().finally(() => {
      pending = null;
    });
  }
  return pending;
}

function needsReverify(r: Response) {
  return r.status === 401 && r.headers.get("X-Human-Check") === "required";
}

/**
 * `fetch` for gated routes. Rejects when the visitor can't be verified, which
 * callers already treat like any other failed request.
 */
export async function humanFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  await ensureHuman();
  const r = await fetch(input, init);
  if (!SITE_KEY || !needsReverify(r)) return r;

  // The hint said we were verified but the server disagrees (cookie lapsed,
  // or the browser's user agent changed): drop the hint and verify again.
  document.cookie = `${HINT_COOKIE}=; Path=/; Max-Age=0`;
  await ensureHuman();
  return fetch(input, init);
}
