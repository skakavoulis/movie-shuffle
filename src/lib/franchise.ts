import {
  getTitleSummary,
  sortByReleaseDate,
  type Franchise,
  type FranchisePart,
  type FranchiseRelation,
} from "./tmdb";
import { SITE_NAME, siteUrl } from "./site";
import { createTitleCache } from "./titleCache";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const REQUEST_TIMEOUT_MS = 8000;
const FRANCHISE_TTL_SECONDS = 7 * 24 * 60 * 60; // 1 week
/** How long a page render waits for an uncached show; see getTitleFacts. */
const RENDER_WAIT_MS = 2500;
/**
 * Wikidata franchises also hold shorts, specials and one-off episodes with
 * TMDB ids. Below this many TMDB votes a released title is treated as one.
 */
const MIN_VOTES = 50;

/** Wikidata classes kept as franchise entries: series, films and their kin. */
const KINDS = [
  "Q5398426", // television series
  "Q11424", // film
  "Q581714", // animated television series
  "Q1259759", // miniseries
  "Q202866", // animated film
  "Q506240", // television film
];

type Binding = Record<string, { value: string } | undefined>;

/**
 * A title can match several branches of the query (Better Call Saul is both
 * Breaking Bad's spin-off and in its franchise); the most specific wins.
 */
const RELATION_PRIORITY: FranchiseRelation[] = [
  "spinoffOf",
  "spinoff",
  "previous",
  "next",
  "franchise",
];

function isRelation(v: string | undefined): v is FranchiseRelation {
  return RELATION_PRIORITY.includes(v as FranchiseRelation);
}

function buildQuery(tvId: number) {
  // Members come from the show's media franchise plus its direct spin-offs
  // and sequels, since many franchises are only linked that way; ?rel says
  // which. The show itself is added by the caller: matching it here with
  // BIND(?item AS ?member) in a UNION makes the query time out.
  return `
SELECT DISTINCT ?franchiseLabel ?tv ?movie ?rel WHERE {
  ?item wdt:P4983 "${tvId}" .
  OPTIONAL { ?item wdt:P8345 ?franchise }
  { ?item wdt:P8345 ?f . ?member wdt:P8345 ?f . BIND("franchise" AS ?rel) }
  UNION { ?item wdt:P2512 ?member . BIND("spinoff" AS ?rel) }
  UNION { ?member wdt:P2512 ?item . BIND("spinoffOf" AS ?rel) }
  UNION { ?item wdt:P155 ?member . BIND("previous" AS ?rel) }
  UNION { ?item wdt:P156 ?member . BIND("next" AS ?rel) }
  OPTIONAL { ?member wdt:P4983 ?tv }
  OPTIONAL { ?member wdt:P4947 ?movie }
  FILTER(BOUND(?tv) || BOUND(?movie))
  FILTER EXISTS {
    ?member wdt:P31 ?kind .
    FILTER(?kind IN (${KINDS.map((k) => `wd:${k}`).join(", ")}))
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}`;
}

async function fetchMembers(tvId: number) {
  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set("query", buildQuery(tvId));

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": `${SITE_NAME}/1.0 (${siteUrl()})`,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Wikidata SPARQL error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { results?: { bindings?: Binding[] } };
  const bindings = data.results?.bindings ?? [];

  const members = new Map<
    string,
    { mediaType: "movie" | "tv"; id: number; relation: FranchiseRelation }
  >();
  for (const b of bindings) {
    const tv = Number(b.tv?.value);
    const movie = Number(b.movie?.value);
    const relation = b.rel?.value;
    if (!isRelation(relation)) continue;

    const member = Number.isInteger(tv)
      ? { mediaType: "tv" as const, id: tv, relation }
      : Number.isInteger(movie)
        ? { mediaType: "movie" as const, id: movie, relation }
        : null;
    if (!member) continue;

    const key = `${member.mediaType}:${member.id}`;
    const seen = members.get(key);
    if (
      !seen ||
      RELATION_PRIORITY.indexOf(relation) <
        RELATION_PRIORITY.indexOf(seen.relation)
    ) {
      members.set(key, member);
    }
  }

  const label = bindings.find((b) => b.franchiseLabel)?.franchiseLabel?.value;
  // The label service falls back to the bare Q-id without an English label.
  const franchiseName = label && !/^Q\d+$/.test(label) ? label : null;

  return { members: [...members.values()], franchiseName };
}

function isUpcoming(releaseDate: string, today: string) {
  return !!releaseDate && releaseDate > today;
}

async function fetchTVFranchise(tvId: number): Promise<Franchise | null> {
  const { members, franchiseName } = await fetchMembers(tvId);
  if (!members.length) return null;

  // The show itself is always looked up, whether or not Wikidata listed it.
  const self = members.find((m) => m.mediaType === "tv" && m.id === tvId);
  if (self) members.splice(members.indexOf(self), 1);
  members.push({ mediaType: "tv", id: tvId, relation: "franchise" });

  // Wikidata has no posters or reliable dates, so each member is looked up
  // on TMDB. Ids TMDB doesn't know (stale Wikidata links) just drop out.
  const settled = await Promise.allSettled(
    members.map(async (m) => {
      const summary = await getTitleSummary(m.mediaType, m.id);
      return { ...summary, relation: m.relation };
    }),
  );

  const today = new Date().toISOString().slice(0, 10);
  let currentTitle: string | null = null;
  const parts: FranchisePart[] = [];
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    const { part, vote_count, relation } = result.value;
    const current = part.mediaType === "tv" && part.id === tvId;
    if (current) {
      currentTitle = part.title;
      parts.push(part);
      continue;
    }
    // Direct links are deliberate, so only franchise-wide members are
    // screened for shorts and specials.
    if (
      relation !== "franchise" ||
      vote_count >= MIN_VOTES ||
      isUpcoming(part.release_date, today)
    ) {
      parts.push({ ...part, relation });
    }
  }

  if (parts.length < 2) return null;

  return {
    name: franchiseName
      ? `${franchiseName} franchise`
      : `${currentTitle ?? "Series"} universe`,
    parts: sortByReleaseDate(parts),
  };
}

/** Wrapped because the cache's `data` column is NOT NULL; see wikidata.ts. */
type CachedFranchise = { franchise: Franchise | null; version?: number };

/** Bump when the cached shape changes; 2 added each part's relation. */
const CACHE_VERSION = 2;

const cachedFranchise = createTitleCache<CachedFranchise>({
  table: "franchise_cache",
  ttlSeconds: FRANCHISE_TTL_SECONDS,
  label: "franchise",
  isCurrent: (data) => data.version === CACHE_VERSION,
});

async function fetchCachedFranchise(
  _mediaType: "movie" | "tv",
  tmdbId: number,
): Promise<CachedFranchise> {
  return {
    franchise: await fetchTVFranchise(tmdbId),
    version: CACHE_VERSION,
  };
}

/**
 * For TV page renders; TMDB has no collections for series, so the franchise
 * comes from Wikidata. Resolves to null when it's unavailable right now (a
 * failure, or an uncached show slower than RENDER_WAIT_MS) and never throws.
 * A slow fetch carries on to fill the cache.
 */
export async function getTVFranchise(
  tvId: number,
): Promise<CachedFranchise | null> {
  const lookup = cachedFranchise("tv", tvId, fetchCachedFranchise).catch(
    () => null,
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), RENDER_WAIT_MS);
  });
  return Promise.race([lookup, timeout]).finally(() => clearTimeout(timer));
}
