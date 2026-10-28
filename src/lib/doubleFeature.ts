import {
  getPersonMovieCredits,
  type TMDBMovie,
  type TMDBMovieDetails,
} from "./tmdb";

/** A second movie to watch after this one, with the reason they pair well. */
export interface DoubleFeature {
  movie: Pick<
    TMDBMovie,
    "id" | "title" | "poster_path" | "release_date" | "vote_average"
  >;
  /** Short tag, e.g. "Same director". */
  label: string;
  /** One sentence on why the two go together. */
  reason: string;
}

/** Below this, a credit is usually a short, a doc or something few have seen. */
const MIN_VOTES = 300;
/**
 * A filmography pick has to be good on its own, not just by the same person,
 * and seen widely enough that the rating isn't a few early votes.
 */
const MIN_FILMOGRAPHY_RATING = 6.5;
const MIN_FILMOGRAPHY_VOTES = 1000;

function year(date: string | undefined) {
  return date ? Number(date.slice(0, 4)) : NaN;
}

/** "the same year", "a year later", "12 years earlier". */
function gapPhrase(from: string, to: string) {
  const diff = year(to) - year(from);
  if (Number.isNaN(diff)) return null;
  if (diff === 0) return "the same year";
  const n = Math.abs(diff);
  const dir = diff < 0 ? "earlier" : "later";
  return n === 1 ? `a year ${dir}` : `${n} years ${dir}`;
}

function pick(movie: TMDBMovie): DoubleFeature["movie"] {
  return {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path,
    release_date: movie.release_date,
    vote_average: movie.vote_average,
  };
}

async function directedBy(personId: number) {
  const person = await getPersonMovieCredits(personId);
  return (person.movie_credits?.crew ?? []).filter(
    (c) => c.job === "Director" && !c.video,
  );
}

const isVoiceRole = (character: string | undefined) =>
  /\(voice\)/i.test(character ?? "");

/** Voice roles only count when this movie is one too. */
async function ledBy(personId: number, includeVoice: boolean) {
  const person = await getPersonMovieCredits(personId);
  return (person.movie_credits?.cast ?? []).filter(
    (c) =>
      c.order <= 2 && !c.video && (includeVoice || !isVoiceRole(c.character)),
  );
}

/**
 * Picks one movie to pair with `movie`. In order of preference: a
 * recommendation by the same director, a recommendation with the same lead,
 * the director's then the lead's best-known well-rated other film, then the
 * top recommendation. Parts of
 * the same franchise are skipped since the franchise strip already covers
 * them. Null when nothing qualifies or the lookups fail.
 */
export async function getDoubleFeature(
  movie: TMDBMovieDetails,
  franchiseIds: number[],
): Promise<DoubleFeature | null> {
  const director = movie.credits?.crew?.find((c) => c.job === "Director");
  const lead = movie.credits?.cast?.find((c) => c.order === 0);
  const today = new Date().toISOString().slice(0, 10);
  const exclude = new Set([movie.id, ...franchiseIds]);
  const eligible = (m: TMDBMovie) =>
    !exclude.has(m.id) &&
    !!m.release_date &&
    m.release_date <= today &&
    (m.vote_count ?? 0) >= MIN_VOTES;

  const [directorFilms, leadFilms] = await Promise.all([
    director ? directedBy(director.id).catch(() => []) : [],
    lead ? ledBy(lead.id, isVoiceRole(lead.character)).catch(() => []) : [],
  ]);

  const recs = (movie.recommendations?.results ?? []).filter(eligible);
  const byDirector = directorFilms.filter(eligible);
  const byLead = leadFilms.filter(eligible);
  const directorIds = new Set(byDirector.map((m) => m.id));
  const leadIds = new Set(byLead.map((m) => m.id));

  const describeGap = (other: TMDBMovie) => {
    const gap = gapPhrase(movie.release_date, other.release_date);
    return gap ? `, made ${gap}` : "";
  };
  const bestKnown = <T extends TMDBMovie & { vote_count: number }>(
    films: T[],
  ) =>
    films
      .filter(
        (m) =>
          m.vote_average >= MIN_FILMOGRAPHY_RATING &&
          m.vote_count >= MIN_FILMOGRAPHY_VOTES,
      )
      .sort((a, b) => b.vote_count - a.vote_count)[0];

  const recByDirector = recs.find((m) => directorIds.has(m.id));
  if (director && recByDirector) {
    return {
      movie: pick(recByDirector),
      label: "Same director",
      reason: `Also directed by ${director.name}${describeGap(recByDirector)}.`,
    };
  }

  const recByLead = recs.find((m) => leadIds.has(m.id));
  if (lead && recByLead) {
    return {
      movie: pick(recByLead),
      label: "Same star",
      reason: `Also starring ${lead.name}${describeGap(recByLead)}.`,
    };
  }

  const topByDirector = bestKnown(byDirector);
  if (director && topByDirector) {
    return {
      movie: pick(topByDirector),
      label: "Same director",
      reason: `Another ${director.name} film${describeGap(topByDirector)}.`,
    };
  }

  const topByLead = bestKnown(byLead);
  if (lead && topByLead) {
    return {
      movie: pick(topByLead),
      label: "Same star",
      reason: `${lead.name} in the lead again${describeGap(topByLead)}.`,
    };
  }

  const topRec = recs[0];
  if (topRec) {
    const genres = movie.genres
      .filter((g) => topRec.genre_ids.includes(g.id))
      .slice(0, 2)
      .map((g) => g.name.toLowerCase());
    return {
      movie: pick(topRec),
      label: "Fan favorite",
      reason: genres.length
        ? `What fans of this one watch next, with more ${genres.join(" and ")}.`
        : "What fans of this one watch next.",
    };
  }

  return null;
}
