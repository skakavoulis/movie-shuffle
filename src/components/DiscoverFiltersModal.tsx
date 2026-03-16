import { useState, useEffect, useCallback } from "react";
import {
  providerLogoUrl,
  type TMDBGenre,
  type TMDBWatchProvider,
} from "@/lib/tmdb";

export interface DiscoverFilters {
  releaseYearGte: string;
  voteAverageGte: number;
  genreIds: number[];
  providerIds: number[];
}

export const DEFAULT_FILTERS: DiscoverFilters = {
  releaseYearGte: "",
  voteAverageGte: 0,
  genreIds: [],
  providerIds: [],
};

export function activeFilterCount(f: DiscoverFilters): number {
  let count = 0;
  if (f.releaseYearGte) count++;
  if (f.voteAverageGte > 0) count++;
  if (f.genreIds.length > 0) count++;
  if (f.providerIds.length > 0) count++;
  return count;
}

type MediaType = "movie" | "tv";

interface DiscoverFiltersModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: DiscoverFilters) => void;
  current: DiscoverFilters;
  genres: TMDBGenre[];
  providers: TMDBWatchProvider[];
  mediaType: MediaType;
  onMediaTypeChange: (type: MediaType) => void;
}

export default function DiscoverFiltersModal({
  open,
  onClose,
  onApply,
  current,
  genres,
  providers,
  mediaType,
  onMediaTypeChange,
}: DiscoverFiltersModalProps) {
  const [draft, setDraft] = useState<DiscoverFilters>(current);

  useEffect(() => {
    if (open) setDraft(current);
  }, [open, current]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  const toggleGenre = useCallback((id: number) => {
    setDraft((prev) => ({
      ...prev,
      genreIds: prev.genreIds.includes(id)
        ? prev.genreIds.filter((g) => g !== id)
        : [...prev.genreIds, id],
    }));
  }, []);

  const toggleProvider = useCallback((id: number) => {
    setDraft((prev) => ({
      ...prev,
      providerIds: prev.providerIds.includes(id)
        ? prev.providerIds.filter((p) => p !== id)
        : [...prev.providerIds, id],
    }));
  }, []);

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleReset = () => {
    setDraft(DEFAULT_FILTERS);
  };

  if (!open) return null;

  const currentYear = new Date().getFullYear();

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[85vh] bg-bg-card border border-border rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-bold text-text-primary">Filters</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Movies / TV switch */}
          <section>
            <label className="block text-sm font-semibold text-text-primary mb-2">
              Content type
            </label>
            <div className="flex rounded-lg bg-bg-primary border border-border p-0.5">
              <button
                onClick={() => onMediaTypeChange("movie")}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  mediaType === "movie"
                    ? "bg-accent text-white shadow-sm"
                    : "text-text-secondary hover:text-white"
                }`}
              >
                Movies
              </button>
              <button
                onClick={() => onMediaTypeChange("tv")}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  mediaType === "tv"
                    ? "bg-accent text-white shadow-sm"
                    : "text-text-secondary hover:text-white"
                }`}
              >
                TV Shows
              </button>
            </div>
          </section>

          {/* Release Year */}
          <section>
            <label className="block text-sm font-semibold text-text-primary mb-2">
              Released after year
            </label>
            <input
              type="number"
              min={1900}
              max={currentYear + 2}
              placeholder="e.g. 2015"
              value={draft.releaseYearGte}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  releaseYearGte: e.target.value,
                }))
              }
              className="w-full px-4 py-2.5 rounded-lg bg-bg-primary border border-border text-text-primary placeholder-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
            />
          </section>

          {/* Vote Average */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-text-primary">
                Minimum rating
              </label>
              <span className="text-sm font-bold text-yellow-400 tabular-nums">
                {draft.voteAverageGte > 0
                  ? draft.voteAverageGte.toFixed(1)
                  : "Any"}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={9}
              step={0.5}
              value={draft.voteAverageGte}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  voteAverageGte: Number(e.target.value),
                }))
              }
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-bg-primary accent-yellow-400"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>Any</span>
              <span>9.0</span>
            </div>
          </section>

          {/* Genres */}
          <section>
            <label className="block text-sm font-semibold text-text-primary mb-3">
              Genres
            </label>
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => {
                const active = draft.genreIds.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      active
                        ? "bg-accent text-white shadow-md shadow-accent/20"
                        : "bg-bg-primary border border-border text-text-secondary hover:text-white hover:border-white/20"
                    }`}
                  >
                    {genre.name}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Streaming Services */}
          {providers.length > 0 && (
            <section>
              <label className="block text-sm font-semibold text-text-primary mb-3">
                Streaming services
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {providers.map((provider) => {
                  const active = draft.providerIds.includes(
                    provider.provider_id,
                  );
                  const logo = providerLogoUrl(provider.logo_path, "w45");
                  return (
                    <button
                      key={provider.provider_id}
                      onClick={() => toggleProvider(provider.provider_id)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? "bg-accent/15 border border-accent/50 text-white"
                          : "bg-bg-primary border border-border text-text-secondary hover:text-white hover:border-white/20"
                      }`}
                    >
                      {logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logo}
                          alt=""
                          className="w-6 h-6 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <span className="truncate">{provider.provider_name}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-text-muted mt-2">
                Streaming data by JustWatch
              </p>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={handleReset}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors shadow-lg shadow-accent/20"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
