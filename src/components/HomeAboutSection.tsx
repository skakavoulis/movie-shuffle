import Link from "next/link";

/** Shared with the homepage's FAQPage structured data so both stay in sync. */
export const HOME_FAQ: { question: string; answer: string }[] = [
  {
    question: "How does the random movie picker work?",
    answer:
      "JustPickAMovie pulls popular, trending, top-rated and now-playing films from TMDB and reshuffles them throughout the day, so you get a fresh set of picks instead of the same top-ten list.",
  },
  {
    question: "Can I filter random picks by genre or streaming service?",
    answer:
      "Yes. Discover mode lets you narrow suggestions by genre, release year, rating and the streaming services available in your region, then swipe through matches one at a time.",
  },
  {
    question: "Does JustPickAMovie show where to stream a movie?",
    answer:
      "Every movie and TV show page lists where it is available to stream, rent or buy in your selected region, alongside the trailer, cast and ratings.",
  },
  {
    question: "Is JustPickAMovie free?",
    answer:
      "Yes, it is free to use. Signing in with Google is optional and lets you keep a watchlist and a list of the movies and shows you liked.",
  },
];

const STEPS = [
  {
    title: "Shuffle",
    body: "Get a random mix of popular, trending and critically acclaimed movies, reshuffled throughout the day.",
  },
  {
    title: "Swipe",
    body: "Use Discover to swipe left to skip and right to like, filtered by genre, year and streaming service.",
  },
  {
    title: "Watch",
    body: "Open any title to see the trailer, cast, ratings and where it is streaming in your region.",
  },
];

export default function HomeAboutSection() {
  return (
    <section
      aria-labelledby="home-about-heading"
      className="mt-10 border-t border-white/10 bg-bg-secondary/40 px-6 py-16 md:px-12 md:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              Your next great watch
            </p>
            <h2
              id="home-about-heading"
              className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-text-primary md:text-5xl"
            >
              Stop scrolling. Start watching.
            </h2>
          </div>
          <div>
            <p className="text-base leading-8 text-text-secondary md:text-lg">
              Movie night should feel like a choice, not a chore. JustPickAMovie
              turns the endless streaming shelf into a short list of genuinely
              good ideas, from trending hits to top-rated classics and new
              releases.
            </p>
            <Link
              href="/discover"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-text-primary transition-colors hover:text-accent"
            >
              Find your next watch
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <ol className="mt-14 grid gap-3 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="group rounded-2xl border border-white/10 bg-bg-card/70 p-6 transition-colors hover:border-accent/60 hover:bg-bg-card"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-accent">0{i + 1}</span>
                <span className="text-text-muted transition-transform group-hover:translate-x-1" aria-hidden="true">↗</span>
              </div>
              <h3 className="mt-10 text-xl font-semibold text-text-primary">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-text-secondary">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-20 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">Good to know</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
            {HOME_FAQ.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-text-primary">
                  <h3 className="text-base">{faq.question}</h3>
                  <span className="text-xl font-light text-text-muted transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
