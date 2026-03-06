import { useLikes } from "@/context/LikesContext";

interface LikeButtonProps {
  mediaType: "movie" | "tv";
  mediaId: number;
  title: string;
  poster_path: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}

export default function LikeButton({
  mediaType,
  mediaId,
  title,
  poster_path,
  size = "md",
  className = "",
  children,
}: LikeButtonProps) {
  const { isLiked, toggleLike } = useLikes();
  const liked = isLiked(mediaType, mediaId);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLike({ mediaType, mediaId, title, poster_path });
  };

  return (
    <button
      onClick={handleClick}
      aria-label={liked ? "Unlike" : "Like"}
      className={`transition-all duration-200 ${liked ? "text-red-500 scale-110" : "text-white/70 hover:text-red-400"} hover:scale-125 active:scale-95 ${className}`}
    >
      <span className="flex items-center gap-2">
        <svg
          className={sizeClasses[size]}
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        {children}
      </span>
    </button>
  );
}
