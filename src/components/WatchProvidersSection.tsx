import Image from "next/image";
import {
  providerLogoUrl,
  type TMDBWatchProvider,
  type TMDBWatchProviderOffer,
} from "@/lib/tmdb";
import { getProviderSearchUrl } from "@/lib/providerUrls";

interface WatchProvidersSectionProps {
  offer: TMDBWatchProviderOffer | null;
  /** Title used to build direct search URLs on each provider */
  title: string;
}

function ProviderGroup({
  label,
  providers,
  watchLink,
  title,
}: {
  label: string;
  providers: TMDBWatchProvider[];
  watchLink: string;
  title: string;
}) {
  if (providers.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => {
          const href = getProviderSearchUrl(p.provider_id, title) ?? watchLink;
          return (
            <a
              key={p.provider_id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-card border border-border hover:border-white/30 hover:bg-bg-hover transition-colors group"
            >
              {p.logo_path ? (
                <Image
                  src={providerLogoUrl(p.logo_path, "w92")!}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded object-contain flex-shrink-0"
                />
              ) : (
                <span className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-text-muted text-xs font-bold flex-shrink-0">
                  {p.provider_name[0]}
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
  title,
}: WatchProvidersSectionProps) {
  if (!offer?.link) return null;

  const flatrate = offer.flatrate ?? [];
  const rent = offer.rent ?? [];
  const buy = offer.buy ?? [];
  const free = offer.free ?? [];
  const ads = offer.ads ?? [];

  const hasAny =
    flatrate.length > 0 ||
    rent.length > 0 ||
    buy.length > 0 ||
    free.length > 0 ||
    ads.length > 0;

  if (!hasAny) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xl md:text-2xl font-bold text-text-primary mb-4">
        Where to watch
      </h2>
      <div className="space-y-4">
        {flatrate.length > 0 && (
          <ProviderGroup
            label="Stream"
            providers={flatrate}
            watchLink={offer.link}
            title={title}
          />
        )}
        {free.length > 0 && (
          <ProviderGroup
            label="Free"
            providers={free}
            watchLink={offer.link}
            title={title}
          />
        )}
        {ads.length > 0 && (
          <ProviderGroup
            label="With ads"
            providers={ads}
            watchLink={offer.link}
            title={title}
          />
        )}
        {rent.length > 0 && (
          <ProviderGroup
            label="Rent"
            providers={rent}
            watchLink={offer.link}
            title={title}
          />
        )}
        {buy.length > 0 && (
          <ProviderGroup
            label="Buy"
            providers={buy}
            watchLink={offer.link}
            title={title}
          />
        )}
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
      </p>
    </section>
  );
}
