import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export function withAuth<P extends { [key: string]: unknown }>(
  handler: (
    context: GetServerSidePropsContext,
    userId: string
  ) => Promise<GetServerSidePropsResult<P>>
) {
  return async (
    context: GetServerSidePropsContext
  ): Promise<GetServerSidePropsResult<P>> => {
    const supabase = createServerSupabaseClient(context);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        redirect: {
          destination: "/auth",
          permanent: false,
        },
      };
    }

    return handler(context, user.id);
  };
}
