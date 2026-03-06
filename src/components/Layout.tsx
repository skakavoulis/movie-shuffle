import Link from "next/link";
import { useRouter } from "next/router";
import { createClient } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { useState, useRef, useEffect } from "react";

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
}

export default function Layout({ children, user }: LayoutProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.reload();
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-bg-primary via-bg-primary/90 to-transparent">
        <nav className="flex items-center justify-between px-6 md:px-12 py-4">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-2xl font-extrabold tracking-tight text-accent hover:text-accent-hover transition-colors"
            >
              MovieShuffle
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/"
                className={`text-sm font-medium transition-colors ${
                  router.pathname === "/"
                    ? "text-white"
                    : "text-text-secondary hover:text-white"
                }`}
              >
                Home
              </Link>
              {user && (
                <Link
                  href="/profile"
                  className={`text-sm font-medium transition-colors ${
                    router.pathname === "/profile"
                      ? "text-white"
                      : "text-text-secondary hover:text-white"
                  }`}
                >
                  Profile
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors"
                >
                  {user.user_metadata?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="User avatar"
                      className="w-6 h-6 rounded-full border border-accent/40 bg-bg-primary object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-semibold text-sm">
                      {user.email?.[0]?.toUpperCase() ?? "U"}
                    </div>
                  )}
                  <span className="hidden md:inline">{user.email}</span>
                  <svg
                    className="w-6 h-6 rounded-full bg-accent/20 border border-accent/40 p-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                    <Link
                      href="/profile"
                      className="block px-4 py-3 text-sm text-text-secondary hover:bg-bg-hover hover:text-white transition-colors"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm text-text-secondary hover:bg-bg-hover hover:text-white transition-colors border-t border-border"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth"
                className="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="px-6 md:px-12 py-8 border-t border-border mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-text-muted">
          <p>
            &copy; {new Date().getFullYear()} MovieShuffle. Powered by TMDB.
          </p>
          <p>
            This product uses the TMDB API but is not endorsed or certified by
            TMDB.
          </p>
        </div>
      </footer>
    </div>
  );
}
