import type { ExternalRatings as ExternalRatingsData } from "@/lib/ratings";

interface Props {
  ratings: ExternalRatingsData | null;
}

const PILL =
  "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold";
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

export default function ExternalRatings({ ratings }: Props) {
  if (!ratings) return null;

  const { imdb, imdbVotes, tomatometer, audienceScore, metacritic } = ratings;

  return (
    <>
      {imdb != null && (
        <span className={`${PILL} bg-[#f5c518]/10 text-[#f5c518]`}>
          <span className={LABEL}>IMDb</span>
          {imdb.toFixed(1)}
          {imdbVotes ? (
            <span className="text-text-muted font-normal">
              ({imdbVotes.toLocaleString()})
            </span>
          ) : null}
        </span>
      )}
      {tomatometer != null && (
        <span className={`${PILL} ${freshnessTone(tomatometer)}`}>
          <span className={LABEL}>RT Critics</span>
          {tomatometer}%
        </span>
      )}
      {audienceScore != null && (
        <span className={`${PILL} ${freshnessTone(audienceScore)}`}>
          <span className={LABEL}>RT Audience</span>
          {audienceScore}%
        </span>
      )}
      {metacritic != null && (
        <span className={`${PILL} ${metascoreTone(metacritic)}`}>
          <span className={LABEL}>Metacritic</span>
          {metacritic}
        </span>
      )}
    </>
  );
}
