import {
  getPersonMovieCredits,
  getPersonTVCredits,
  type TMDBGenre,
  type TMDBMovie,
  type TMDBMovieDetails,
  type TMDBTVShow,
  type TMDBTVShowDetails,
} from "./tmdb";

/** A second title to watch after this one, with the reason they pair well. */
export interface DoubleFeature {
  pick: {
    mediaType: "movie" | "tv";
    id: number;
    title: string;
    poster_path: string | null;
    /** Release date for movies, first air date for series. */
    date: string;
  };
  /** Short tag, e.g. "Same director". */
  label: string;
  /** One sentence on why the two go together. */
  reason: string;
}

/** A movie or series trimmed to what the pairing rules look at. */
interface Candidate {
  mediaType: "movie" | "tv";
  id: number;
  title: string;
  poster_path: string | null;
  date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
}

/**
 * Vote floors differ by type: series collect far fewer votes than movies of
 * similar reach.
 */
interface Thresholds {
  /** Below this, a title is usually a short, a doc or something few have seen. */
  minVotes: number;
  /**
   * A filmography pick has to be good on its own, not just by the same
   * person, and seen widely enough that the rating isn't a few early votes.
   */
  minFilmographyVotes: number;
}

const MOVIE_THRESHOLDS: Thresholds = { minVotes: 300, minFilmographyVotes: 1000 };
const TV_THRESHOLDS: Thresholds = { minVotes: 100, minFilmographyVotes: 300 };
const MIN_FILMOGRAPHY_RATING = 6.5;

// News, Reality, Talk
const NON_SCRIPTED_GENRES = new Set([10763, 10764, 10767]);
/** Caps the credit lookups for titles with a long list of directors or creators. */
const MAX_MAKERS = 3;
/** Fewer episodes than this is a guest spot rather than a main role. */
const MIN_LEAD_EPISODES = 10;

const isVoiceRole = (character: string | undefined) =>
  /\(voice\)/i.test(character ?? "");

function fromMovie(m: TMDBMovie): Candidate {
  return {
    mediaType: "movie",
    id: m.id,
    title: m.title,
    poster_path: m.poster_path,
    date: m.release_date ?? "",
    vote_average: m.vote_average,
    vote_count: m.vote_count ?? 0,
    genre_ids: m.genre_ids ?? [],
  };
}

function fromShow(s: TMDBTVShow): Candidate {
  return {
    mediaType: "tv",
    id: s.id,
    title: s.name,
    poster_path: s.poster_path,
    date: s.first_air_date ?? "",
    vote_average: s.vote_average,
    vote_count: s.vote_count ?? 0,
    genre_ids: s.genre_ids ?? [],
  };
}

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

interface PairingInput {
  current: { id: number; date: string; genres: TMDBGenre[] };
  recommendations: Candidate[];
  /** The directors of a movie, or the creators of a series. */
  makers: { name: string; works: Candidate[] }[];
  makerLabel: string;
  /** "directed" or "created", for "Also directed by X". */
  makerRole: string;
  lead?: { name: string };
  leadWorks: Candidate[];
  /** Franchise parts, which the franchise strip already covers. */
  exclude: number[];
  thresholds: Thresholds;
  /** "film" or "series", for "Another X film". */
  noun: string;
  /** "made" or "premiered", for "made 4 years later". */
  dateVerb: string;
}

/**
 * In order of preference: a recommendation by the same maker, a
 * recommendation with the same lead, the maker's then the lead's best-known
 * well-rated other work, then the top recommendation.
 */
function choosePairing(input: PairingInput): DoubleFeature | null {
  const { current, lead, thresholds, noun, dateVerb } = input;
  const { makerLabel, makerRole } = input;
  const today = new Date().toISOString().slice(0, 10);
  const exclude = new Set([current.id, ...input.exclude]);
  const eligible = (c: Candidate) =>
    !exclude.has(c.id) &&
    !!c.date &&
    c.date <= today &&
    c.vote_count >= thresholds.minVotes;

  const recs = input.recommendations.filter(eligible);
  // Each work credited to the first maker who has it.
  const makerOf = new Map<number, string>();
  const byMaker: Candidate[] = [];
  for (const maker of input.makers) {
    for (const work of maker.works.filter(eligible)) {
      if (makerOf.has(work.id)) continue;
      makerOf.set(work.id, maker.name);
      byMaker.push(work);
    }
  }
  const byLead = input.leadWorks.filter(eligible);
  const leadIds = new Set(byLead.map((c) => c.id));

  const toFeature = (c: Candidate, label: string, reason: string) => ({
    pick: {
      mediaType: c.mediaType,
      id: c.id,
      title: c.title,
      poster_path: c.poster_path,
      date: c.date,
    },
    label,
    reason,
  });
  const describeGap = (c: Candidate) => {
    const gap = gapPhrase(current.date, c.date);
    return gap ? `, ${dateVerb} ${gap}` : "";
  };
  const bestKnown = (works: Candidate[]) =>
    works
      .filter(
        (c) =>
          c.vote_average >= MIN_FILMOGRAPHY_RATING &&
          c.vote_count >= thresholds.minFilmographyVotes,
      )
      .sort((a, b) => b.vote_count - a.vote_count)[0];

  const recByMaker = recs.find((c) => makerOf.has(c.id));
  if (recByMaker) {
    return toFeature(
      recByMaker,
      makerLabel,
      `Also ${makerRole} by ${makerOf.get(recByMaker.id)}${describeGap(recByMaker)}.`,
    );
  }

  const recByLead = recs.find((c) => leadIds.has(c.id));
  if (lead && recByLead) {
    return toFeature(
      recByLead,
      "Same star",
      `Also starring ${lead.name}${describeGap(recByLead)}.`,
    );
  }

  const topByMaker = bestKnown(byMaker);
  if (topByMaker) {
    return toFeature(
      topByMaker,
      makerLabel,
      `Another ${makerOf.get(topByMaker.id)} ${noun}${describeGap(topByMaker)}.`,
    );
  }

  const topByLead = bestKnown(byLead);
  if (lead && topByLead) {
    return toFeature(
      topByLead,
      "Same star",
      `${lead.name} in the lead again${describeGap(topByLead)}.`,
    );
  }

  const topRec = recs[0];
  if (topRec) {
    const genres = current.genres
      .filter((g) => topRec.genre_ids.includes(g.id))
      .slice(0, 2)
      .map((g) => g.name.toLowerCase());
    return toFeature(
      topRec,
      "Fan favorite",
      genres.length
        ? `What fans of this one watch next, with more ${genres.join(" and ")}.`
        : "What fans of this one watch next.",
    );
  }

  return null;
}

/**
 * Picks one movie to pair with `movie`. Parts of the same franchise are
 * skipped. Null when nothing qualifies or the lookups fail.
 */
export async function getMovieDoubleFeature(
  movie: TMDBMovieDetails,
  franchiseIds: number[],
): Promise<DoubleFeature | null> {
  const directors = (movie.credits?.crew ?? [])
    .filter((c) => c.job === "Director")
    .slice(0, MAX_MAKERS);
  const lead = movie.credits?.cast?.find((c) => c.order === 0);
  // Voice roles only count when this title is one too.
  const includeVoice = isVoiceRole(lead?.character);

  const [makers, led] = await Promise.all([
    Promise.all(
      directors.map(async (d) => ({
        name: d.name,
        works: await getPersonMovieCredits(d.id)
          .then((p) =>
            (p.movie_credits?.crew ?? [])
              .filter((c) => c.job === "Director" && !c.video)
              .map(fromMovie),
          )
          .catch(() => []),
      })),
    ),
    lead
      ? getPersonMovieCredits(lead.id)
          .then((p) =>
            (p.movie_credits?.cast ?? []).filter(
              (c) =>
                c.order <= 2 &&
                !c.video &&
                (includeVoice || !isVoiceRole(c.character)),
            ),
          )
          .catch(() => [])
      : [],
  ]);

  return choosePairing({
    current: { id: movie.id, date: movie.release_date, genres: movie.genres },
    recommendations: (movie.recommendations?.results ?? []).map(fromMovie),
    makers,
    makerLabel: "Same director",
    makerRole: "directed",
    lead,
    leadWorks: led.map(fromMovie),
    exclude: franchiseIds,
    thresholds: MOVIE_THRESHOLDS,
    noun: "film",
    dateVerb: "made",
  });
}

/**
 * Picks one series to pair with `show`, the TV counterpart of
 * `getMovieDoubleFeature` with creators in place of directors.
 */
export async function getTVDoubleFeature(
  show: TMDBTVShowDetails,
  franchiseIds: number[],
): Promise<DoubleFeature | null> {
  const creators = (show.created_by ?? []).slice(0, MAX_MAKERS);
  const lead = show.credits?.cast?.find((c) => c.order === 0);
  const includeVoice = isVoiceRole(lead?.character);

  const [makers, led] = await Promise.all([
    Promise.all(
      creators.map(async (c) => ({
        name: c.name,
        works: await getPersonTVCredits(c.id)
          .then((p) =>
            p.crew.filter((w) => w.job === "Creator").map(fromShow),
          )
          .catch(() => []),
      })),
    ),
    lead
      ? getPersonTVCredits(lead.id)
          .then((p) =>
            p.cast.filter(
              (c) =>
                c.episode_count >= MIN_LEAD_EPISODES &&
                !c.genre_ids.some((g) => NON_SCRIPTED_GENRES.has(g)) &&
                (includeVoice || !isVoiceRole(c.character)),
            ),
          )
          .catch(() => [])
      : [],
  ]);

  return choosePairing({
    current: { id: show.id, date: show.first_air_date, genres: show.genres },
    recommendations: (show.recommendations?.results ?? []).map(fromShow),
    makers,
    makerLabel: "Same creator",
    makerRole: "created",
    lead,
    leadWorks: led.map(fromShow),
    exclude: franchiseIds,
    thresholds: TV_THRESHOLDS,
    noun: "series",
    dateVerb: "premiered",
  });
}
