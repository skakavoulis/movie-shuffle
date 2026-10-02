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
      className="px-6 md:px-12 py-12 mt-6 border-t border-border"
    >
      <div className="max-w-5xl">
        <h2
          id="home-about-heading"
          className="text-2xl md:text-3xl font-bold text-text-primary"
        >
          A random movie generator for when you can&apos;t decide
        </h2>
        <p className="mt-4 text-text-secondary leading-relaxed">
          Endless scrolling through streaming menus is the fastest way to ruin
          movie night. JustPickAMovie picks for you: a fresh, random selection
          of films from today&apos;s{" "}
          <strong className="text-text-primary font-semibold">
            trending movies
          </strong>
          , all-time{" "}
          <strong className="text-text-primary font-semibold">
            top-rated classics
          </strong>{" "}
          and{" "}
          <strong className="text-text-primary font-semibold">
            new releases in theaters
          </strong>
          . Prefer series? Browse random{" "}
          <Link href="/tv-shows" className="text-accent hover:underline">
            TV show picks
          </Link>
          , or let{" "}
          <Link href="/discover" className="text-accent hover:underline">
            Discover
          </Link>{" "}
          find something that matches your taste.
        </p>

        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="bg-bg-card border border-border rounded-xl p-5"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                Step {i + 1}
              </span>
              <h3 className="mt-1 text-lg font-semibold text-text-primary">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <h2 className="mt-12 text-xl md:text-2xl font-bold text-text-primary">
          Frequently asked questions
        </h2>
        <div className="mt-4 divide-y divide-border border-y border-border">
          {HOME_FAQ.map((faq) => (
            <details key={faq.question} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-text-primary">
                <h3 className="text-base">{faq.question}</h3>
                <svg
                  className="w-5 h-5 shrink-0 text-text-muted transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <p className="mt-3 text-sm text-text-secondary leading-relaxed">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
