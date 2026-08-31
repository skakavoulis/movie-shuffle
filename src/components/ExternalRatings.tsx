import type { ReactNode } from "react";
import type { ExternalRatings as ExternalRatingsData } from "@/lib/ratings";

interface Props {
  ratings: ExternalRatingsData | null;
}

const PILL =
  "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold";
const PILL_LINK =
  "hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-[filter]";
const LABEL = "text-[10px] font-bold uppercase tracking-wider opacity-80";

/** Rotten Tomatoes brands anything below 60 as "rotten" and drops the red badge. */
function freshnessTone(score: number) {
  return score >= 60
    ? "bg-red-500/10 text-red-400"
    : "bg-green-500/10 text-green-400";
}

/** Metacritic's own banding: 61+ favourable, 40-60 mixed, below 40 unfavourable. */
function metascoreTone(score: number) {
  if (score >= 61) return "bg-green-500/10 text-green-400";
  if (score >= 40) return "bg-yellow-400/10 text-yellow-400";
  return "bg-red-500/10 text-red-400";
}

function RatingPill({
  href,
  className,
  label,
  children,
}: {
  href: string | null | undefined;
  className: string;
  label: string;
  children: ReactNode;
}) {
  const classes = href
    ? `${PILL} ${PILL_LINK} ${className}`
    : `${PILL} ${className}`;

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        aria-label={`${label} (opens in a new tab)`}
      >
        {children}
      </a>
    );
  }

  return <span className={classes}>{children}</span>;
}

export default function ExternalRatings({ ratings }: Props) {
  if (!ratings) return null;

  const {
    imdb,
    imdbVotes,
    tomatometer,
    audienceScore,
    metacritic,
    imdbUrl,
    rtUrl,
    metacriticUrl,
  } = ratings;

  return (
    <>
      {imdb != null && (
        <RatingPill
          href={imdbUrl}
          className="bg-[#f5c518]/10 text-[#f5c518]"
          label="IMDb"
        >
          <span className={LABEL}>IMDb</span>
          {imdb.toFixed(1)}
          {imdbVotes ? (
            <span className="text-text-muted font-normal">
              ({imdbVotes.toLocaleString()})
            </span>
          ) : null}
        </RatingPill>
      )}
      {tomatometer != null && (
        <RatingPill
          href={rtUrl}
          className={freshnessTone(tomatometer)}
          label="Rotten Tomatoes critics"
        >
          <span className={LABEL}>RT Critics</span>
          {tomatometer}%
        </RatingPill>
      )}
      {audienceScore != null && (
        <RatingPill
          href={rtUrl}
          className={freshnessTone(audienceScore)}
          label="Rotten Tomatoes audience"
        >
          <span className={LABEL}>RT Audience</span>
          {audienceScore}%
        </RatingPill>
      )}
      {metacritic != null && (
        <RatingPill
          href={metacriticUrl}
          className={metascoreTone(metacritic)}
          label="Metacritic"
        >
          <span className={LABEL}>Metacritic</span>
          {metacritic}
        </RatingPill>
      )}
    </>
  );
}
