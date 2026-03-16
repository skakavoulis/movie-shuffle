import Link from "next/link";
import { useRouter } from "next/router";
import { createClient } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { useState, useRef, useEffect } from "react";
import SearchBar from "./SearchBar";
import RegionDropdown from "./RegionDropdown";
import { useRegion } from "@/context/RegionContext";

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
}

export default function Layout({ children, user }: LayoutProps) {
  const router = useRouter();
  const { region, setRegion, regions, loading } = useRegion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [router.asPath]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.reload();
  };

  const navLinks = [
    { href: "/", label: "Movies" },
    { href: "/tv-shows", label: "TV Shows" },
    { href: "/discover", label: "Discover" },
  ];

  return (
    <>
      <div className="min-h-screen bg-bg-primary">
        <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-bg-primary via-bg-primary/90 to-transparent">
          <nav className="flex items-center justify-between px-6 md:px-12 py-4">
            <div className="flex items-center gap-8">
              <Link
                href="/"
                className="text-2xl font-extrabold tracking-tight text-accent hover:text-accent-hover transition-colors"
              >
                JustPickAMovie
              </Link>
              <div className="hidden min-[1160px]:flex items-center gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium transition-colors ${
                      router.pathname === link.href
                        ? "text-white"
                        : "text-text-secondary hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <RegionDropdown key={router.asPath} />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden min-[1160px]:block">
                <SearchBar />
              </div>

              {/* Desktop user menu */}
              <div className="hidden min-[1160px]:block">
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
                      <span className="hidden lg:inline">{user.email}</span>
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
                        <Link
                          href="/watchlist"
                          className="block px-4 py-3 text-sm text-text-secondary hover:bg-bg-hover hover:text-white transition-colors"
                        >
                          Watchlist
                        </Link>
                        <Link
                          href="/my-movies"
                          className="block px-4 py-3 text-sm text-text-secondary hover:bg-bg-hover hover:text-white transition-colors"
                        >
                          My Movies
                        </Link>
                        <Link
                          href="/my-tv-shows"
                          className="block px-4 py-3 text-sm text-text-secondary hover:bg-bg-hover hover:text-white transition-colors"
                        >
                          My TV Shows
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

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="min-[1160px]:hidden p-2 -mr-2 text-text-secondary hover:text-white transition-colors"
                aria-label="Toggle menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {mobileOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </nav>
        </header>

        {/* Mobile menu overlay */}
        <div
          className={`fixed inset-0 z-40 min-[1160px]:hidden transition-opacity duration-300 ${
            mobileOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className={`absolute top-0 right-0 h-full w-72 bg-bg-card border-l border-border shadow-2xl transition-transform duration-300 ease-out ${
              mobileOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex flex-col h-full pt-20 pb-8">
              {/* Search */}
              <div className="px-6 mb-6">
                <SearchBar />
              </div>

              {/* Region selector (mobile) */}
              {!loading && regions.length > 0 && (
                <div className="px-6 mb-4">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Region
                  </p>
                  <select
                    value={region}
                    onChange={(e) => {
                      setRegion(e.target.value);
                      setMobileOpen(false);
                    }}
                    className="w-full px-4 py-2.5 rounded-lg bg-bg-primary border border-border text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/50"
                  >
                    {regions.map((r) => (
                      <option key={r.iso_3166_1} value={r.iso_3166_1}>
                        {r.english_name} ({r.iso_3166_1})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Nav links */}
              <div className="flex-1 px-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                      router.pathname === link.href
                        ? "text-white bg-white/5"
                        : "text-text-secondary hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {link.label === "Movies" && (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                        />
                      </svg>
                    )}
                    {link.label === "TV Shows" && (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                    {link.label === "Discover" && (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                        />
                      </svg>
                    )}
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* User menu items (when logged in) */}
              {user && (
                <div className="px-2 mb-4">
                  <Link
                    href="/profile"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                      router.pathname === "/profile"
                        ? "text-white bg-white/5"
                        : "text-text-secondary hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Profile
                  </Link>
                  <Link
                    href="/watchlist"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                      router.pathname === "/watchlist"
                        ? "text-white bg-white/5"
                        : "text-text-secondary hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                    Watchlist
                  </Link>
                  <Link
                    href="/my-movies"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                      router.pathname === "/my-movies"
                        ? "text-white bg-white/5"
                        : "text-text-secondary hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    My Movies
                  </Link>
                  <Link
                    href="/my-tv-shows"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                      router.pathname === "/my-tv-shows"
                        ? "text-white bg-white/5"
                        : "text-text-secondary hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    My TV Shows
                  </Link>
                </div>
              )}

              {/* Auth section */}
              <div className="px-6 pt-4 border-t border-border">
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {user.user_metadata?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.user_metadata.avatar_url}
                          alt="Avatar"
                          className="w-9 h-9 rounded-full border border-accent/40 bg-bg-primary object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-semibold text-sm">
                          {user.email?.[0]?.toUpperCase() ?? "U"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {user.user_metadata?.full_name ?? "User"}
                        </p>
                        <p className="text-xs text-text-muted truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white text-sm font-medium transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/auth"
                    className="block w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold text-center transition-colors"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <main>{children}</main>

        <footer className="px-6 md:px-12 py-8 border-t border-border mt-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-text-muted">
            <p>
              &copy; 2021-{new Date().getFullYear()} JustPickAMovie. Powered by
              TMDB.
            </p>
            <p>
              This product uses the TMDB API but is not endorsed or certified by
              TMDB.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
