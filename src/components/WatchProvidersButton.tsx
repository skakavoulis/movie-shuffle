import Image from "next/image";
import { providerLogoUrl } from "@/lib/tmdb";
import type {
  OfferType,
  WatchOffer,
  WatchProviderLink,
} from "@/lib/providerUrls";

interface WatchProvidersSectionProps {
  offer: WatchOffer | null;
}

const GROUP_LABELS: Record<OfferType, string> = {
  flatrate: "Stream",
  free: "Free",
  ads: "With ads",
  rent: "Rent",
  buy: "Buy",
};

function linkLabel(p: WatchProviderLink, type: OfferType): string {
  if (p.kind === "search") return `Search on ${p.name}`;
  if (p.kind === "tmdb") return `${p.name}: see watch options`;
  const action = type === "rent" ? "Rent" : type === "buy" ? "Buy" : "Watch";
  return p.price
    ? `${action} on ${p.name} for ${p.price}`
    : `${action} on ${p.name}`;
}

function ProviderGroup({
  type,
  providers,
}: {
  type: OfferType;
  providers: WatchProviderLink[];
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
        {GROUP_LABELS[type]}
      </p>
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => {
          const label = linkLabel(p, type);
          return (
            <a
              key={p.id}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-card border border-border hover:border-white/30 hover:bg-bg-hover transition-colors group"
            >
              {p.logoPath ? (
                <Image
                  src={providerLogoUrl(p.logoPath, "w92")!}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded object-contain flex-shrink-0"
                />
              ) : (
                <span className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-text-muted text-xs font-bold flex-shrink-0">
                  {p.name[0]}
                </span>
              )}
              {p.price && (
                <span className="text-sm font-medium text-text-secondary group-hover:text-white transition-colors">
                  {p.price}
                </span>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default function WatchProvidersSection({
  offer,
}: WatchProvidersSectionProps) {
  if (!offer || offer.groups.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xl md:text-2xl font-bold text-text-primary mb-4">
        Where to watch
      </h2>
      <div className="space-y-4">
        {offer.groups.map((g) => (
          <ProviderGroup key={g.type} type={g.type} providers={g.providers} />
        ))}
      </div>
      <p className="mt-3 text-xs text-text-muted">
        Streaming data by{" "}
        <a
          href={offer.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover underline"
        >
          JustWatch
        </a>
        {offer.hasDirectLinks && (
          <>
            {" "}
            · Links by{" "}
            <a
              href="https://www.movieofthenight.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover underline"
            >
              Movie of the Night
            </a>
          </>
        )}
      </p>
    </section>
  );
}
