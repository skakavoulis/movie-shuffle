import creators from "@/config/great-creators.json";

/**
 * The directors on the Great Creators page live in
 * src/config/great-creators.json: edit that list to add, remove or reorder
 * them. The options below tune how many films each one gets.
 */

export interface GreatCreator {
  /** TMDB person id — the number in themoviedb.org/person/<id>-<name>. */
  tmdbId: number;
  /** Name shown on the card. */
  name: string;
  /** Overrides the page-wide minVoteCount, for directors whose films are little voted on. */
  minVoteCount?: number;
}

export const greatCreatorsConfig = {
  title: "Great Creators",
  intro:
    "The directors critics return to most often, from the classic masters to the leading names of this century, each with their highest-rated films.",

  /** Where the list comes from; credited at the bottom of the page. */
  sources: [
    {
      name: "They Shoot Pictures, Don't They? — Top 250 Directors (2026 edition)",
      url: "https://www.theyshootpictures.com/gf1000_top250directors.htm",
    },
    {
      name: "They Shoot Pictures, Don't They? — The 21st Century's Most Acclaimed Films: Top 100 Directors (2026 edition)",
      url: "https://theyshootpictures.com/21stcentury_top100directors.htm",
    },
  ],

  /** Films listed per director, highest rated first. */
  moviesPerCreator: 12,

  /**
   * Films with fewer TMDB votes than this are left out, so a handful of
   * perfect scores on an obscure short cannot outrank the classics. A
   * director can override it in the JSON file.
   */
  minVoteCount: 100,

  /** How often the page is rebuilt with fresh ratings, in seconds. */
  revalidateSeconds: 86_400,

  /** One floor per entry, in the order listed in the JSON file. */
  creators: creators as GreatCreator[],
};
