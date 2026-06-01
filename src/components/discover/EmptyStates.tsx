import { SadFaceIcon } from "./Icons";
import type { DiscoverMediaType } from "./types";
import { mediaLabel } from "./types";

interface MediaTypeProps {
  mediaType: DiscoverMediaType;
}

export function LoadingSpinner({ mediaType }: MediaTypeProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-20">
      <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <p className="text-text-muted text-sm mt-4">
        Finding {mediaLabel(mediaType)} for you...
      </p>
    </div>
  );
}

export function NoResults({
  mediaType,
  onEditFilters,
}: MediaTypeProps & { onEditFilters: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-20">
      <SadFaceIcon className="w-16 h-16 text-text-muted mb-4" />
      <p className="text-text-secondary text-lg font-medium mb-1">
        No {mediaLabel(mediaType)} found
      </p>
      <p className="text-text-muted text-sm mb-4 text-center max-w-xs">
        Try adjusting your filters for more results
      </p>
      <button
        onClick={onEditFilters}
        className="px-5 py-2 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors text-sm"
      >
        Edit Filters
      </button>
    </div>
  );
}

export function LoadingMore({ mediaType }: MediaTypeProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-20">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <p className="text-text-secondary text-sm mt-4">
        Loading more {mediaLabel(mediaType)}...
      </p>
    </div>
  );
}
