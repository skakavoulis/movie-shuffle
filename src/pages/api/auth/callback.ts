import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const code = req.query.code as string | undefined;

  if (code) {
    const supabase = createServerSupabaseClient({ req, res });
    await supabase.auth.exchangeCodeForSession(code);
  }

  res.redirect(303, "/");
}
