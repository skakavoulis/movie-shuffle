import Image from "next/image";
import Link from "next/link";
import { profileUrl } from "@/lib/tmdb";
import { greatCreatorsConfig } from "@/lib/greatCreators";

export interface PromoCreator {
  id: number;
  name: string;
  profile_path: string | null;
}

interface GreatCreatorsPromoSectionProps {
  creators: PromoCreator[];
}

const TILTS = ["-rotate-6", "rotate-3", "-rotate-2", "rotate-6", "-rotate-3", "rotate-2"];

export default function GreatCreatorsPromoSection({
  creators,
}: GreatCreatorsPromoSectionProps) {
  const total = greatCreatorsConfig.creators.length;
  const names = creators.slice(0, 3).map((c) => c.name);

  return (
    <section className="px-6 md:px-12 py-6">
      <Link
        href="/great-creators"
        className="group relative flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-bg-card via-bg-secondary to-bg-primary px-6 py-8 md:px-10 md:py-10 transition-colors hover:border-accent/40"
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 100% 50%, rgba(229,9,20,0.18) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            New · Great Creators
          </p>
          <h2 className="mt-2 text-2xl md:text-3xl font-extrabold text-text-primary">
            Pick a film from the {total} greatest directors
          </h2>
          <p className="mt-3 text-text-secondary">
            {names.length > 0
              ? `From ${names.join(", ")} and many more — `
              : "From the classic masters to the leading names of this century — "}
            browse each director&apos;s best films by rating, or let us surprise
            you with one.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors group-hover:bg-accent-hover">
            Meet the directors
            <svg
              className="w-4 h-4 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>

        {creators.length > 0 && (
          <div className="relative flex lg:flex-1 lg:justify-end pl-4 py-2">
            {creators.map((creator, i) => (
              <div
                key={creator.id}
                title={creator.name}
                className={`relative -ml-4 flex-shrink-0 w-20 md:w-28 aspect-[2/3] overflow-hidden rounded-lg bg-bg-card shadow-xl ring-1 ring-white/15 transition-transform duration-300 group-hover:rotate-0 group-hover:-translate-y-1 ${TILTS[i % TILTS.length]}`}
              >
                {profileUrl(creator.profile_path) ? (
                  <Image
                    src={profileUrl(creator.profile_path)!}
                    alt={creator.name}
                    fill
                    sizes="(min-width: 768px) 112px, 80px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl font-bold text-text-muted">
                    {creator.name[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Link>
    </section>
  );
}
