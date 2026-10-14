import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { AUTH_RETURN_COOKIE, safeReturnPath } from "@/lib/authReturn";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const code = req.query.code as string | undefined;

  if (code) {
    const supabase = createServerSupabaseClient({ req, res });
    await supabase.auth.exchangeCodeForSession(code);
  }

  const returnTo = safeReturnPath(req.cookies[AUTH_RETURN_COOKIE]);
  if (returnTo) {
    // Keep the session cookies set by exchangeCodeForSession.
    const existing = res.getHeader("Set-Cookie") ?? [];
    res.setHeader("Set-Cookie", [
      ...(Array.isArray(existing) ? existing : [String(existing)]),
      `${AUTH_RETURN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`,
    ]);
  }

  res.redirect(303, returnTo ?? "/");
}
