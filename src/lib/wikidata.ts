import { SITE_NAME, siteUrl } from "./site";
import { createTitleCache } from "./titleCache";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const REQUEST_TIMEOUT_MS = 8000;
const FACTS_TTL_SECONDS = 7 * 24 * 60 * 60; // 1 week
/**
 * How long a page render waits for an uncached title. Past this the page
 * renders without facts while the fetch carries on to fill the cache.
 */
const RENDER_WAIT_MS = 2500;

/** Wikidata properties holding a title's TMDB id, per media type. */
const TMDB_ID_PROPERTY = { movie: "P4947", tv: "P4983" } as const;

export interface WikidataLink {
  label: string;
  /** Set when Wikidata knows the TMDB id, so we can link internally. */
  tmdbId: number | null;
}

export interface WikidataAward {
  label: string;
  /** Ceremony years, ascending; empty when Wikidata has no date. */
  years: number[];
  /** Individuals credited for this title (e.g. the actor for Best Actor). */
  people: string[];
}

export interface TitleFacts {
  wikidataUrl: string;
  wikipediaUrl: string | null;
  wins: WikidataAward[];
  nominations: WikidataAward[];
  basedOn: { label: string; author: string | null }[];
  setIn: string[];
  filmedIn: string[];
  music: string[];
  cinematography: string[];
  follows: WikidataLink[];
  followedBy: WikidataLink[];
}

type Binding = Record<string, { value: string } | undefined>;

function buildQuery(mediaType: "movie" | "tv", tmdbId: number) {
  const tmdbProp = TMDB_ID_PROPERTY[mediaType];
  // One UNION branch per fact keeps each multi-valued property from
  // multiplying the others' rows, as chained OPTIONALs would. Awards are read
  // from both the title and the people credited "for work" on it, which is
  // where acting and directing awards usually live.
  return `
SELECT ?item ?kind ?value ?valueLabel ?time ?personLabel ?authorLabel ?tmdb WHERE {
  ?item wdt:${tmdbProp} "${tmdbId}" .
  {
    BIND("win" AS ?kind)
    ?item p:P166 ?st . ?st ps:P166 ?value . OPTIONAL { ?st pq:P585 ?time }
  } UNION {
    BIND("win" AS ?kind)
    ?person p:P166 ?st . ?st ps:P166 ?value ; pq:P1686 ?item . OPTIONAL { ?st pq:P585 ?time }
  } UNION {
    BIND("nomination" AS ?kind)
    ?item p:P1411 ?st . ?st ps:P1411 ?value . OPTIONAL { ?st pq:P585 ?time }
  } UNION {
    BIND("nomination" AS ?kind)
    ?person p:P1411 ?st . ?st ps:P1411 ?value ; pq:P1686 ?item . OPTIONAL { ?st pq:P585 ?time }
  }
  UNION { BIND("basedOn" AS ?kind) ?item wdt:P144 ?value . OPTIONAL { ?value wdt:P50 ?author } }
  UNION { BIND("setIn" AS ?kind) ?item wdt:P840 ?value }
  UNION { BIND("filmedIn" AS ?kind) ?item wdt:P915 ?value }
  UNION { BIND("music" AS ?kind) ?item wdt:P86 ?value }
  UNION { BIND("cinematography" AS ?kind) ?item wdt:P344 ?value }
  UNION { BIND("follows" AS ?kind) ?item wdt:P155 ?value . OPTIONAL { ?value wdt:${tmdbProp} ?tmdb } }
  UNION { BIND("followedBy" AS ?kind) ?item wdt:P156 ?value . OPTIONAL { ?value wdt:${tmdbProp} ?tmdb } }
  UNION { BIND("wikipedia" AS ?kind) ?value schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}`;
}

/** The label service falls back to the bare Q-id when there's no English label. */
function label(b: Binding, key: string): string | null {
  const v = b[key]?.value;
  return v && !/^Q\d+$/.test(v) ? v : null;
}

function uniquePush<T>(list: T[], item: T, key: (t: T) => string) {
  if (!list.some((x) => key(x) === key(item))) list.push(item);
}

/** Merges the per-statement rows for each award into one entry per award. */
function collectAwards(rows: Binding[]): WikidataAward[] {
  const byId = new Map<string, WikidataAward>();
  for (const b of rows) {
    const id = b.value?.value;
    const name = label(b, "valueLabel");
    if (!id || !name) continue;

    const award = byId.get(id) ?? { label: name, years: [], people: [] };
    byId.set(id, award);

    const year = b.time?.value ? Number(b.time.value.slice(0, 4)) : NaN;
    if (Number.isFinite(year) && !award.years.includes(year)) {
      award.years.push(year);
    }
    const person = label(b, "personLabel");
    if (person && !award.people.includes(person)) award.people.push(person);
  }
  for (const award of byId.values()) award.years.sort((a, z) => a - z);
  return [...byId.values()];
}

function parseFacts(bindings: Binding[]): TitleFacts | null {
  const itemUri = bindings[0]?.item?.value;
  if (!itemUri) return null;

  const facts: TitleFacts = {
    wikidataUrl: itemUri.replace("http://", "https://"),
    wikipediaUrl: null,
    wins: [],
    nominations: [],
    basedOn: [],
    setIn: [],
    filmedIn: [],
    music: [],
    cinematography: [],
    follows: [],
    followedBy: [],
  };

  const byKind = new Map<string, Binding[]>();
  for (const b of bindings) {
    const kind = b.kind?.value;
    if (!kind) continue;
    byKind.set(kind, [...(byKind.get(kind) ?? []), b]);
  }

  facts.wins = collectAwards(byKind.get("win") ?? []);
  facts.nominations = collectAwards(byKind.get("nomination") ?? []);
  facts.wikipediaUrl = byKind.get("wikipedia")?.[0]?.value?.value ?? null;

  for (const b of byKind.get("basedOn") ?? []) {
    const name = label(b, "valueLabel");
    if (name) {
      uniquePush(
        facts.basedOn,
        { label: name, author: label(b, "authorLabel") },
        (x) => x.label,
      );
    }
  }

  for (const kind of [
    "setIn",
    "filmedIn",
    "music",
    "cinematography",
  ] as const) {
    for (const b of byKind.get(kind) ?? []) {
      const name = label(b, "valueLabel");
      if (name) uniquePush(facts[kind], name, (x) => x);
    }
  }

  for (const kind of ["follows", "followedBy"] as const) {
    for (const b of byKind.get(kind) ?? []) {
      const name = label(b, "valueLabel");
      const tmdb = Number(b.tmdb?.value);
      if (name) {
        uniquePush(
          facts[kind],
          { label: name, tmdbId: Number.isInteger(tmdb) ? tmdb : null },
          (x) => x.label,
        );
      }
    }
  }

  return facts;
}

async function fetchTitleFacts(
  mediaType: "movie" | "tv",
  tmdbId: number,
): Promise<TitleFacts | null> {
  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set("query", buildQuery(mediaType, tmdbId));

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/sparql-results+json",
      // Wikimedia's User-Agent policy asks for a descriptive agent with a
      // way to reach the operator.
      "User-Agent": `${SITE_NAME}/1.0 (${siteUrl()})`,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Wikidata SPARQL error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { results?: { bindings?: Binding[] } };
  return parseFacts(data.results?.bindings ?? []);
}

/**
 * Wrapped because the cache's `data` column is NOT NULL, and titles without a
 * Wikidata item are cached too so they aren't queried on every render.
 */
export type CachedFacts = { facts: TitleFacts | null };

const cachedFacts = createTitleCache<CachedFacts>({
  table: "wikidata_facts_cache",
  ttlSeconds: FACTS_TTL_SECONDS,
  label: "wikidata",
});

async function fetchCachedFacts(
  mediaType: "movie" | "tv",
  tmdbId: number,
): Promise<CachedFacts> {
  return { facts: await fetchTitleFacts(mediaType, tmdbId) };
}

/**
 * For page renders. Resolves to null when the facts are unavailable right now
 * (Wikidata failed, or an uncached title took longer than RENDER_WAIT_MS) and
 * never throws, so Wikidata can't hold up or error the page. Failures aren't
 * cached, so the next render retries; a slow fetch carries on to fill the
 * cache.
 */
export async function getTitleFacts(
  mediaType: "movie" | "tv",
  tmdbId: number,
): Promise<CachedFacts | null> {
  const lookup = cachedFacts(mediaType, tmdbId, fetchCachedFacts).catch(
    () => null,
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), RENDER_WAIT_MS);
  });
  return Promise.race([lookup, timeout]).finally(() => clearTimeout(timer));
}
