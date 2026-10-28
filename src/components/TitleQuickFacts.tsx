import { useState, type ReactNode } from "react";
import Link from "next/link";
import { movieHref, tvHref } from "@/lib/tmdb";
import type { TitleFacts, WikidataAward, WikidataLink } from "@/lib/wikidata";

export type QuickFact = { term: string; value: ReactNode };

type Props = {
  mediaType: "movie" | "tv";
  /**
   * Facts the page has from TMDB; Wikidata's follow them. Falsy entries are
   * skipped, so callers can write `cond && { ... }`.
   */
  facts: (QuickFact | false | "" | null | undefined)[];
  /** Loaded in getServerSideProps so the facts are in the server HTML. */
  wikidata: TitleFacts | null;
};

const AWARDS_PREVIEW = 6;
const PLACES_PREVIEW = 4;

/** Ceremonies people recognise lead the list; Wikidata returns them unordered. */
const MAJOR_AWARDS = [
  /^Academy Award/,
  /^Palme d'Or/,
  /^Golden Lion/,
  /^Golden Bear/,
  /^Primetime Emmy/,
  /^Golden Globe/,
  /^BAFTA|^British Academy/,
  /National Film Registry/,
  /^Screen Actors Guild/,
  /^Peabody/,
];

function awardRank(award: WikidataAward) {
  const i = MAJOR_AWARDS.findIndex((re) => re.test(award.label));
  return i === -1 ? MAJOR_AWARDS.length : i;
}

function sortAwards(awards: WikidataAward[]) {
  return [...awards].sort(
    (a, z) => awardRank(a) - awardRank(z) || a.label.localeCompare(z.label),
  );
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function Awards({
  wins,
  nominations,
}: {
  wins: WikidataAward[];
  nominations: WikidataAward[];
}) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  // With no recorded wins, the nominations are the story.
  const listed = sortAwards(wins.length ? wins : nominations);
  const visible = showAll ? listed : listed.slice(0, AWARDS_PREVIEW);

  return (
    <div className="mt-5 max-w-3xl">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-400/10 text-yellow-400 text-sm font-semibold hover:bg-yellow-400/20 transition-colors"
      >
        <svg
          className="w-4 h-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
          />
        </svg>
        {wins.length > 0 && plural(wins.length, "win")}
        {wins.length > 0 && nominations.length > 0 && (
          <span className="text-yellow-400/60">·</span>
        )}
        {nominations.length > 0 && plural(nominations.length, "nomination")}
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="mt-3 bg-bg-card/80 border border-border rounded-xl p-4">
          {!wins.length && (
            <p className="mb-3 text-xs text-text-muted">Nominated for</p>
          )}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {visible.map((award) => (
              <li key={award.label} className="text-sm">
                <p className="text-text-primary">{award.label}</p>
                {(award.people.length > 0 || award.years.length > 0) && (
                  <p className="text-xs text-text-muted">
                    {[award.people.join(", "), award.years.join(", ")]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {listed.length > AWARDS_PREVIEW && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-3 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            >
              {showAll ? "Show fewer" : `Show all ${listed.length}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TitleLinks({
  links,
  mediaType,
}: {
  links: WikidataLink[];
  mediaType: "movie" | "tv";
}) {
  return (
    <>
      {links.map((link, i) => (
        <span key={link.label}>
          {i > 0 && ", "}
          {link.tmdbId ? (
            <Link
              href={
                mediaType === "tv"
                  ? tvHref({ id: link.tmdbId, name: link.label })
                  : movieHref({ id: link.tmdbId, title: link.label })
              }
              className="text-accent hover:text-accent-hover transition-colors"
            >
              {link.label}
            </Link>
          ) : (
            link.label
          )}
        </span>
      ))}
    </>
  );
}

function Places({ places }: { places: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const hidden = places.length - PLACES_PREVIEW;
  const visible = expanded ? places : places.slice(0, PLACES_PREVIEW);

  return (
    <>
      {visible.join(", ")}
      {hidden > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-2 font-normal text-accent hover:text-accent-hover transition-colors"
        >
          {expanded ? "less" : `+${hidden} more`}
        </button>
      )}
    </>
  );
}

/** Wikidata's facts in the same shape as the page's own TMDB ones. */
function wikidataFacts(
  facts: TitleFacts,
  mediaType: "movie" | "tv",
): QuickFact[] {
  const out: QuickFact[] = [];
  if (facts.basedOn.length) {
    out.push({
      term: "Based on",
      value: facts.basedOn
        .map((b) => (b.author ? `${b.label} by ${b.author}` : b.label))
        .join("; "),
    });
  }
  if (facts.music.length) {
    out.push({ term: "Music by", value: facts.music.join(", ") });
  }
  if (facts.cinematography.length) {
    out.push({
      term: "Cinematography",
      value: facts.cinematography.join(", "),
    });
  }
  if (facts.setIn.length) {
    out.push({ term: "Set in", value: <Places places={facts.setIn} /> });
  }
  if (facts.filmedIn.length) {
    out.push({ term: "Filmed in", value: <Places places={facts.filmedIn} /> });
  }
  if (facts.follows.length) {
    out.push({
      term: "Preceded by",
      value: <TitleLinks links={facts.follows} mediaType={mediaType} />,
    });
  }
  if (facts.followedBy.length) {
    out.push({
      term: "Followed by",
      value: <TitleLinks links={facts.followedBy} mediaType={mediaType} />,
    });
  }
  return out;
}

export default function TitleQuickFacts({
  mediaType,
  facts: tmdbFacts,
  wikidata,
}: Props) {
  const extra = wikidata ? wikidataFacts(wikidata, mediaType) : [];
  const all = [...tmdbFacts.filter((f) => !!f), ...extra];
  const hasAwards =
    !!wikidata && (wikidata.wins.length > 0 || wikidata.nominations.length > 0);

  return (
    <>
      {all.length > 0 && (
        <div className="flex flex-wrap gap-x-8 gap-y-3 mt-6 text-sm max-w-3xl">
          {all.map((fact) => (
            <div key={fact.term} className="max-w-xs">
              <span className="text-text-muted">{fact.term}</span>
              <p className="text-text-primary font-medium">{fact.value}</p>
            </div>
          ))}
        </div>
      )}

      {wikidata && hasAwards && (
        <Awards wins={wikidata.wins} nominations={wikidata.nominations} />
      )}

      {wikidata && (extra.length > 0 || hasAwards) && (
        <p className="mt-3 flex flex-wrap gap-x-3 text-xs text-text-muted">
          <span>Facts and awards from Wikidata</span>
          {wikidata.wikipediaUrl && (
            <a
              href={wikidata.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              Wikipedia ↗
            </a>
          )}
          <a
            href={wikidata.wikidataUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            Wikidata ↗
          </a>
        </p>
      )}
    </>
  );
}
