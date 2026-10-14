import type { TMDBWatchProvider, TMDBWatchProviderOffer } from "./tmdb";
import type {
  StreamingOption,
  StreamingOptionType,
} from "./streamingAvailability";

/**
 * Turns TMDB's per-title provider list (which carries no links) into links:
 *   1. a deep link to the title from Streaming Availability, when it has one,
 *   2. a search for the title on the provider's site,
 *   3. TMDB's "where to watch" page for the title.
 * Provider IDs come from TMDB's watch/providers endpoint (JustWatch data).
 */

export type OfferType = "flatrate" | "free" | "ads" | "rent" | "buy";

export const OFFER_TYPES: OfferType[] = ["flatrate", "free", "ads", "rent", "buy"];

export interface WatchProviderLink {
  id: number;
  name: string;
  logoPath: string | null;
  href: string;
  /** Title page on the provider, a search on the provider, or TMDB's page. */
  kind: "direct" | "search" | "tmdb";
  /** Formatted rent/buy price, when known. */
  price: string | null;
}

export interface WatchOffer {
  /** TMDB's "where to watch" page for the title (JustWatch attribution). */
  link: string;
  groups: { type: OfferType; providers: WatchProviderLink[] }[];
  /** True when any link came from Streaming Availability (attribution). */
  hasDirectLinks: boolean;
}

export interface LinkContext {
  title: string;
  /** ISO country code, e.g. "GR". */
  region: string;
}

/** TMDB provider ID → Streaming Availability service ID. */
const DIRECT_SERVICES: Record<number, string> = {
  8: "netflix",
  175: "netflix", // Netflix Kids
  1796: "netflix", // Netflix Standard with Ads
  9: "prime",
  10: "prime", // Amazon Video (rent/buy)
  119: "prime", // Prime Video outside the US
  613: "prime", // Prime Video Free with Ads
  2100: "prime", // Prime Video with Ads
  2: "apple", // Apple TV Store (rent/buy)
  350: "apple", // Apple TV (subscription)
  122: "disney",
  337: "disney",
  1899: "hbo",
  15: "hulu",
  531: "paramount",
  2303: "paramount", // Paramount+ Premium
  2304: "paramount", // Paramount+ Basic with Ads
  2616: "paramount", // Paramount+ Essential
  386: "peacock",
  387: "peacock", // Peacock Premium Plus
  11: "mubi",
  190: "curiosity",
  283: "crunchyroll",
  232: "zee5",
  43: "starz",
  73: "tubi",
  300: "plutotv",
  207: "roku",
  526: "amc",
  151: "britbox",
  258: "criterion",
  510: "discovery",
  520: "discovery",
  524: "discovery",
  103: "all4",
  2311: "all4", // Channel 4 Plus
  38: "iplayer",
  41: "itvx",
  2300: "itvx", // ITVX Premium
  2336: "hotstar",
  1773: "skyshowtime",
  2624: "skyshowtime", // TV2 SkyShowtime
  39: "now",
  591: "now", // Now TV Cinema
  2750: "rtl",
  30: "wow",
  21: "stan",
  230: "crave",
};

/**
 * TMDB lists each storefront channel as its own provider ("MUBI Amazon
 * Channel"); Streaming Availability lists it as an add-on of the storefront.
 */
const CHANNEL_SUFFIXES: [RegExp, string][] = [
  [/\s+amazon\s+channel\s*$/i, "prime"],
  [/\s+apple\s+tv\s+channel\s*$/i, "apple"],
  [/\s+roku\s+premium\s+channel\s*$/i, "roku"],
];

type SearchBuilder = (ctx: LinkContext) => string;

// Title only: adding a year makes Google Play return nothing, and TMDB's
// year can differ from the store's.
const q = (ctx: LinkContext) => encodeURIComponent(ctx.title);

const netflix: SearchBuilder = (c) =>
  `https://www.netflix.com/search?q=${q(c)}`;
const primeVideo: SearchBuilder = (c) =>
  `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${q(c)}`;
const appleTv: SearchBuilder = (c) =>
  `https://tv.apple.com/${c.region.toLowerCase()}/search?term=${q(c)}`;
const paramount: SearchBuilder = (c) =>
  `https://www.paramountplus.com/search/?q=${q(c)}`;
const peacock: SearchBuilder = (c) =>
  `https://www.peacocktv.com/search?q=${q(c)}`;

/**
 * Search pages, used when there is no deep link. Disney+ has no search URL,
 * and Apple's web search only covers Apple TV+ — it can't find store titles,
 * so the Apple TV Store (2) falls back to TMDB's page.
 */
const PROVIDER_SEARCH_URLS: Record<number, SearchBuilder> = {
  8: netflix,
  175: netflix,
  1796: netflix,
  9: primeVideo,
  10: primeVideo,
  119: primeVideo,
  2100: primeVideo,
  350: appleTv,
  1899: (c) => `https://play.hbomax.com/search?q=${q(c)}`,
  15: (c) => `https://www.hulu.com/search?q=${q(c)}`,
  531: paramount,
  2303: paramount,
  2304: paramount,
  2616: paramount,
  386: peacock,
  387: peacock,
  11: (c) => `https://mubi.com/en/search/films?query=${q(c)}`,
  283: (c) => `https://www.crunchyroll.com/search?q=${q(c)}`,
  43: (c) => `https://www.starz.com/search?q=${q(c)}`,
  257: (c) => `https://www.fubo.tv/welcome/search?q=${q(c)}`,
  3: (c) =>
    `https://play.google.com/store/search?q=${q(c)}&c=movies&gl=${c.region.toUpperCase()}`,
  192: (c) =>
    `https://www.youtube.com/results?search_query=${q(c)}`,
  7: (c) =>
    `https://athome.fandango.com/content/browse/search?searchString=${q(c)}`,
};

/** "Paramount+" and "Paramount Plus" should compare equal. */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9]/g, "");
}

function sameChannel(a: string, b: string): boolean {
  if (a.length < 3 || b.length < 3) return a === b;
  return a === b || a.startsWith(b) || b.startsWith(a);
}

function priceOf(option: StreamingOption): number {
  const amount = Number(option.price?.amount);
  return Number.isFinite(amount) ? amount : Infinity;
}

const MATCHING_TYPES: Record<OfferType, StreamingOptionType[]> = {
  flatrate: ["subscription", "free"],
  free: ["free", "subscription"],
  ads: ["free", "subscription"],
  rent: ["rent"],
  buy: ["buy"],
};

function findDirectOption(
  provider: TMDBWatchProvider,
  type: OfferType,
  options: StreamingOption[],
): StreamingOption | null {
  for (const [suffix, service] of CHANNEL_SUFFIXES) {
    if (!suffix.test(provider.provider_name)) continue;
    const channel = normalizeName(provider.provider_name.replace(suffix, ""));
    return (
      options.find(
        (o) =>
          o.service === service &&
          o.type === "addon" &&
          o.addon !== undefined &&
          sameChannel(normalizeName(o.addon), channel),
      ) ?? null
    );
  }

  const service = DIRECT_SERVICES[provider.provider_id];
  if (!service) return null;

  const types = MATCHING_TYPES[type];
  const matches = options.filter(
    (o) => o.service === service && types.includes(o.type),
  );
  if (matches.length === 0) return null;
  // Rent/buy can list several qualities or editions; show the cheapest.
  return matches.reduce((best, o) => (priceOf(o) < priceOf(best) ? o : best));
}

/** Whether Streaming Availability could have a deep link for this provider. */
export function supportsDirectLink(provider: TMDBWatchProvider): boolean {
  return (
    provider.provider_id in DIRECT_SERVICES ||
    CHANNEL_SUFFIXES.some(([suffix]) => suffix.test(provider.provider_name))
  );
}

function formatPrice(price: StreamingOption["price"]): string | null {
  const amount = Number(price?.amount);
  if (!price || !Number.isFinite(amount)) return null;
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: price.currency,
    }).format(amount);
  } catch {
    return `${price.amount} ${price.currency}`;
  }
}

export function buildWatchOffer(
  offer: TMDBWatchProviderOffer,
  options: StreamingOption[],
  ctx: LinkContext,
): WatchOffer {
  let hasDirectLinks = false;

  const groups = OFFER_TYPES.map((type) => ({
    type,
    // Most popular first: the button on title pages features the top one.
    providers: [...(offer[type] ?? [])]
      .sort((a, b) => a.display_priority - b.display_priority)
      .map((p): WatchProviderLink => {
        const direct = findDirectOption(p, type, options);
        if (direct) hasDirectLinks = true;
        const search = PROVIDER_SEARCH_URLS[p.provider_id]?.(ctx);
        return {
          id: p.provider_id,
          name: p.provider_name,
          logoPath: p.logo_path,
          href: direct?.link ?? search ?? offer.link,
          kind: direct ? "direct" : search ? "search" : "tmdb",
          price: direct ? formatPrice(direct.price) : null,
        };
      }),
  })).filter((g) => g.providers.length > 0);

  return { link: offer.link, groups, hasDirectLinks };
}
