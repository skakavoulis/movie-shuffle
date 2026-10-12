import { SITE_NAME } from "@/lib/site";

interface LogoMarkProps {
  className?: string;
}

/**
 * Two poster cards mid-shuffle: the picked one comes forward in the brand
 * accent with a play triangle. Keep the geometry in sync with
 * public/icon.svg and scripts/generate-favicon.py.
 */
export function LogoMark({ className = "w-8 h-8" }: LogoMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="12.5"
        y="11"
        width="30"
        height="42"
        rx="6"
        transform="rotate(-14 27.5 32)"
        fill="#9d0610"
      />
      <g transform="rotate(8 38.5 31)">
        <rect x="23.5" y="10" width="30" height="42" rx="6" fill="#e50914" />
        <path
          d="M34 23.5v15l12.5-7.5z"
          fill="#f1f1f1"
          stroke="#f1f1f1"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span
        className="text-2xl font-extrabold tracking-tight text-accent"
        aria-label={SITE_NAME}
      >
        Just<span className="text-text-primary">Pick</span>AMovie
      </span>
    </span>
  );
}
