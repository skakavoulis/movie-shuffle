import { useState, useRef, useEffect } from "react";
import { useWatchlist } from "@/context/WatchlistContext";
import type { WatchlistStatus } from "@/pages/api/watchlist";

interface WatchlistButtonProps {
  mediaType: "movie" | "tv";
  mediaId: number;
  title: string;
  poster_path: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}

const statusConfig: Record<
  WatchlistStatus,
  { label: string; color: string; activeColor: string }
> = {
  want_to_watch: {
    label: "Will Watch",
    color: "text-yellow-400",
    activeColor: "bg-blue-400/10",
  },
  watched: {
    label: "Watched",
    color: "text-green-400",
    activeColor: "bg-green-400/10",
  },
};

function BookmarkIcon({
  filled,
  className,
}: {
  filled: boolean;
  className: string;
}) {
  return (
    <svg
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function WatchlistButton({
  mediaType,
  mediaId,
  title,
  poster_path,
  size = "md",
  className = "",
  showLabel = false,
}: WatchlistButtonProps) {
  const { getStatus, setWatchlistStatus, removeFromWatchlist } = useWatchlist();
  const currentStatus = getStatus(mediaType, mediaId);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen((prev) => !prev);
  };

  const handleSelect = (status: WatchlistStatus) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentStatus === status) {
      removeFromWatchlist({ mediaType, mediaId });
    } else {
      setWatchlistStatus({ mediaType, mediaId, title, poster_path, status });
    }
    setMenuOpen(false);
  };

  const activeConfig = currentStatus ? statusConfig[currentStatus] : null;

  return (
    <div
      ref={menuRef}
      className={`relative ${className}`}
      style={{ maxHeight: 24, height: 24, minHeight: 24, display: "flex" }}
    >
      <button
        onClick={handleToggleMenu}
        aria-label="Watchlist"
        className={`transition-all duration-200 ${
          currentStatus
            ? `${activeConfig!.color} scale-110`
            : "text-white/70 hover:text-blue-400"
        } hover:scale-125 active:scale-95`}
      >
        <span className="flex items-center gap-2">
          {currentStatus === "watched" ? (
            <CheckIcon className={sizeClasses[size]} />
          ) : (
            <BookmarkIcon
              filled={currentStatus !== null}
              className={sizeClasses[size]}
            />
          )}
        </span>
      </button>

      {menuOpen && (
        <div
          className="absolute z-50 mt-1 right-0 w-44 bg-bg-card border border-border rounded-lg shadow-xl overflow-hidden"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {(
            Object.entries(statusConfig) as [
              WatchlistStatus,
              typeof statusConfig.want_to_watch,
            ][]
          ).map(([status, config]) => {
            const isActive = currentStatus === status;
            return (
              <button
                key={status}
                onClick={handleSelect(status)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                  isActive
                    ? `${config.activeColor} ${config.color} font-medium`
                    : "text-text-secondary hover:bg-bg-hover hover:text-white"
                }`}
              >
                {status === "want_to_watch" ? (
                  <BookmarkIcon
                    filled={isActive}
                    className="w-4 h-4 flex-shrink-0"
                  />
                ) : (
                  <CheckIcon className="w-4 h-4 flex-shrink-0" />
                )}
                {config.label}
                {isActive && (
                  <svg
                    className="w-3 h-3 ml-auto flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            );
          })}
          {currentStatus && (
            <>
              <div className="border-t border-border" />
              <button
                onClick={handleSelect(currentStatus)}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4 flex-shrink-0"
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
                Remove
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
