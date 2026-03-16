import Head from "next/head";
import { useState } from "react";
import type { InferGetServerSidePropsType } from "next";
import type { User } from "@supabase/supabase-js";
import { withAuth } from "@/components/AuthGuard";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createClient } from "@/lib/supabaseClient";
import Layout from "@/components/Layout";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string;
  created_at: string;
}

type ProfilePageProps = {
  user: User;
  profile: Profile;
  [key: string]: unknown;
};

export const getServerSideProps = withAuth<ProfilePageProps>(
  async (context, userId) => {
    const supabase = createServerSupabaseClient(context);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!profile) {
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          display_name: user?.user_metadata?.full_name ?? user?.email ?? "",
          avatar_url: user?.user_metadata?.avatar_url ?? "",
        })
        .select()
        .single();
      profile = newProfile;
    }

    return {
      props: {
        user: user!,
        profile: profile as Profile,
      },
    };
  },
);

export default function ProfilePage({
  user,
  profile: initialProfile,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [displayName, setDisplayName] = useState(initialProfile?.display_name);
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatar_url);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, avatar_url: avatarUrl })
      .eq("id", user.id);

    if (error) {
      setFeedback({ type: "error", message: error.message });
    } else {
      setFeedback({ type: "success", message: "Profile updated!" });
    }
    setSaving(false);
  };

  const provider =
    user.app_metadata?.provider === "google"
      ? "Google"
      : (user.app_metadata?.provider ?? "Email");

  return (
    <Layout user={user}>
      <Head>
        <title>Profile — JustPickAMovie</title>
      </Head>

      <div className="flex items-start justify-center min-h-screen px-6 pt-28 pb-12">
        <div className="w-full max-w-lg bg-bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-text-primary mb-6">
            Your Profile
          </h1>

          <div className="mb-6 p-4 bg-bg-primary rounded-lg border border-border">
            <p className="text-sm text-text-muted">Email</p>
            <p className="text-text-primary font-medium">{user.email}</p>
            <p className="text-xs text-text-muted mt-2">
              Signed in with {provider}
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 bg-bg-primary border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="avatarUrl"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                Avatar URL
              </label>
              <input
                id="avatarUrl"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-4 py-3 bg-bg-primary border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
              />
            </div>

            {avatarUrl && (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-accent/40 bg-bg-primary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                <span className="text-sm text-text-muted">Avatar preview</span>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>

          {feedback && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm text-center ${
                feedback.type === "success"
                  ? "bg-green-500/10 border border-green-500/30 text-green-400"
                  : "bg-red-500/10 border border-red-500/30 text-red-400"
              }`}
            >
              {feedback.message}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
