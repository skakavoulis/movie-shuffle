import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import type {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from "next";
import { config } from "./config";

export function createServerSupabaseClient(
  context:
    | GetServerSidePropsContext
    | { req: NextApiRequest; res: NextApiResponse }
) {
  const { req, res } = context;

  const cookies: CookieMethodsServer = {
    getAll() {
      const result: { name: string; value: string }[] = [];
      const raw = req.headers.cookie ?? "";
      for (const part of raw.split(";")) {
        const [name, ...rest] = part.trim().split("=");
        if (name) result.push({ name, value: rest.join("=") });
      }
      return result;
    },
    setAll(cookiesToSet) {
      const headers: string[] = [];
      for (const { name, value, options } of cookiesToSet) {
        let cookie = `${name}=${value}; Path=${options?.path ?? "/"}`;
        if (options?.maxAge != null) cookie += `; Max-Age=${options.maxAge}`;
        if (options?.httpOnly) cookie += "; HttpOnly";
        if (options?.secure) cookie += "; Secure";
        if (options?.sameSite) cookie += `; SameSite=${options.sameSite}`;
        headers.push(cookie);
      }
      res.setHeader("Set-Cookie", headers);
    },
  };

  return createServerClient(config.supabase.url, config.supabase.anonKey, {
    cookies,
  });
}
