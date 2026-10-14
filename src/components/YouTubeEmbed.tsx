import { useRef } from "react";
import { useYouTubeVolume } from "@/lib/useYouTubeVolume";

interface YouTubeEmbedProps {
  videoKey: string;
  title: string;
}

/** Autoplaying YouTube embed that uses the viewer's saved volume. */
export default function YouTubeEmbed({ videoKey, title }: YouTubeEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const applySavedVolume = useYouTubeVolume(iframeRef);

  return (
    <iframe
      ref={iframeRef}
      onLoad={applySavedVolume}
      src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0&enablejsapi=1`}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="absolute inset-0 w-full h-full"
    />
  );
}
