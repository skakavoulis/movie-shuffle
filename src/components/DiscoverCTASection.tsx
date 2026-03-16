import Link from "next/link";

export default function DiscoverCTASection() {
  return (
    <section className="relative w-full overflow-hidden">
      <div className="relative w-full bg-gradient-to-b from-accent/5 via-bg-card/80 to-accent/5 border-y border-accent/20 px-6 md:px-12 py-14 md:py-20">
        {/* Background accent glow */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(229,9,20,0.15) 0%, transparent 60%)",
          }}
        />

        <div className="relative flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-14">
          {/* Swipe visual - card stack */}
          <div className="flex items-center justify-center gap-4 lg:gap-6">
            {/* Skip indicator */}
            <div className="flex flex-col items-center gap-2 text-red-400/90 animate-swipe-hint">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-red-500/10 border border-red-400/30 flex items-center justify-center">
                <svg
                  className="w-6 h-6 md:w-7 md:h-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider">
                Skip
              </span>
            </div>

            {/* Card stack */}
            <div className="relative w-36 h-52 md:w-44 md:h-64">
              {/* Back cards */}
              <div
                className="absolute inset-0 rounded-2xl bg-gradient-to-b from-bg-primary to-bg-secondary shadow-xl ring-1 ring-white/5"
                style={{ transform: "scale(0.92) translateY(12px)" }}
              />
              <div
                className="absolute inset-0 rounded-2xl bg-gradient-to-b from-bg-primary to-bg-secondary shadow-lg ring-1 ring-white/5"
                style={{ transform: "scale(0.96) translateY(6px)" }}
              />
              {/* Front card */}
              <div className="relative w-36 h-52 md:w-44 md:h-64 rounded-2xl bg-gradient-to-b from-bg-primary to-bg-secondary shadow-2xl ring-1 ring-white/10 flex items-center justify-center overflow-hidden animate-sway">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(45,58,82,0.8)_0%,rgba(26,34,54,0.9)_50%,rgba(15,22,36,1)_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
                <svg
                  className="w-16 h-16 md:w-20 md:h-20 text-accent/60 relative z-10 drop-shadow-lg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>

            {/* Like indicator */}
            <div className="flex flex-col items-center gap-2 text-green-400/90 animate-swipe-hint animate-delay-500">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-green-500/10 border border-green-400/30 flex items-center justify-center">
                <svg
                  className="w-6 h-6 md:w-7 md:h-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider">
                Like
              </span>
            </div>
          </div>

          {/* Text & CTA */}
          <div className="text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-text-primary">
              Can&apos;t decide what to watch?
            </h2>
            <p className="mt-3 md:mt-4 text-text-secondary text-base md:text-xl max-w-xl mx-auto">
              Swipe your way to movie night — left to skip, right to like.
              It&apos;s like Tinder, but for films.
            </p>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 mt-6 md:mt-8 px-6 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-base transition-all shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              Try Discover
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
