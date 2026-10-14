import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { providerLogoUrl } from "@/lib/tmdb";
import type {
  OfferType,
  WatchOffer,
  WatchProviderLink,
} from "@/lib/providerUrls";

interface WatchProvidersButtonProps {
  offer: WatchOffer | null;
  loading: boolean;
}

const GROUP_LABELS: Record<OfferType, string> = {
  flatrate: "Stream",
  free: "Free",
  ads: "With ads",
  rent: "Rent",
  buy: "Buy",
};

const BUTTON_BASE =
  "inline-flex items-center gap-2 px-5 py-3 rounded-lg font-semibold whitespace-nowrap transition-colors";

function linkLabel(p: WatchProviderLink, type: OfferType): string {
  if (p.kind === "search") return `Search on ${p.name}`;
  if (p.kind === "tmdb") return `${p.name}: see watch options`;
  const action = type === "rent" ? "Rent" : type === "buy" ? "Buy" : "Watch";
  return p.price
    ? `${action} on ${p.name} for ${p.price}`
    : `${action} on ${p.name}`;
}

function ProviderLogo({
  provider,
  size,
}: {
  provider: WatchProviderLink;
  size: number;
}) {
  if (provider.logoPath) {
    return (
      <Image
        src={providerLogoUrl(provider.logoPath, "w92")!}
        alt=""
        width={size}
        height={size}
        className="rounded object-contain flex-shrink-0"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="rounded bg-white/10 flex items-center justify-center text-text-muted text-xs font-bold flex-shrink-0"
    >
      {provider.name[0]}
    </span>
  );
}

function TvIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 7h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1zm4-4l4 4 4-4"
      />
    </svg>
  );
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
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
        {GROUP_LABELS[type]}
      </p>
      <ul className="space-y-1">
        {providers.map((p) => {
          const label = linkLabel(p, type);
          return (
            <li key={p.id}>
              <a
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                title={label}
                className="flex items-center gap-3 px-2 py-1.5 -mx-2 rounded-lg hover:bg-bg-hover transition-colors group"
              >
                <ProviderLogo provider={p} size={32} />
                <span className="flex-1 min-w-0 truncate text-sm text-text-primary">
                  {p.name}
                </span>
                {p.price && (
                  <span className="text-sm font-medium text-text-secondary group-hover:text-white transition-colors">
                    {p.price}
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function WatchProvidersButton({
  offer,
  loading,
}: WatchProvidersButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`${BUTTON_BASE} bg-white/5 text-text-muted`}
      >
        <span className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
        Finding where to watch…
      </div>
    );
  }

  // Groups come in OFFER_TYPES order (stream first) and providers by TMDB's
  // display priority, so the first one is the most popular way to watch.
  const top = offer?.groups[0]?.providers[0];

  if (!offer || !top) {
    return (
      <div
        className={`${BUTTON_BASE} bg-white/5 text-text-muted cursor-default`}
        title="No streaming, rental or purchase options in your region"
      >
        <TvIcon />
        Not available to stream
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`${BUTTON_BASE} bg-white/10 hover:bg-white/15 text-white`}
      >
        <ProviderLogo provider={top} size={24} />
        <span className="max-w-[12rem] truncate">Watch at {top.name}</span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Where to watch"
          className="absolute left-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto bg-bg-card border border-border rounded-lg shadow-xl z-50 p-4"
        >
          <div className="space-y-4">
            {offer.groups.map((g) => (
              <ProviderGroup
                key={g.type}
                type={g.type}
                providers={g.providers}
              />
            ))}
          </div>
          <p className="mt-4 pt-3 border-t border-border text-xs text-text-muted">
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
        </div>
      )}
    </div>
  );
}
