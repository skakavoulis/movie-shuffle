import { useCallback, useEffect, useRef, type RefObject } from "react";

const YOUTUBE_ORIGIN = "https://www.youtube.com";
const STORAGE_KEY = "youtube-volume";

interface VolumeSettings {
  /** 0–100, as reported by the YouTube player. */
  volume: number;
  muted: boolean;
}

function readSettings(): VolumeSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VolumeSettings>;
    if (
      typeof parsed.volume !== "number" ||
      parsed.volume < 0 ||
      parsed.volume > 100 ||
      typeof parsed.muted !== "boolean"
    ) {
      return null;
    }
    return { volume: parsed.volume, muted: parsed.muted };
  } catch {
    return null;
  }
}

function writeSettings(settings: VolumeSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable (private mode, quota) — volume just won't persist
  }
}

function post(iframe: HTMLIFrameElement | null, message: object) {
  iframe?.contentWindow?.postMessage(JSON.stringify(message), YOUTUBE_ORIGIN);
}

/**
 * Keeps the volume of YouTube embeds consistent across the site: changes the
 * viewer makes are saved to localStorage and applied to the next video.
 * The iframe must load with `enablejsapi=1`; call the returned function from
 * its `onLoad`.
 */
export function useYouTubeVolume(
  iframeRef: RefObject<HTMLIFrameElement | null>,
) {
  // Last state the player reported. The first report is only a baseline: it
  // reflects embed defaults (e.g. `mute=1` for autoplay), not a viewer choice.
  const lastReported = useRef<VolumeSettings | null>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const iframe = iframeRef.current;
      if (e.origin !== YOUTUBE_ORIGIN || e.source !== iframe?.contentWindow) {
        return;
      }

      let data: { event?: string; info?: Partial<VolumeSettings> | null };
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (data?.event !== "infoDelivery" && data?.event !== "initialDelivery") {
        return;
      }
      const { volume, muted } = data.info ?? {};
      if (typeof volume !== "number" || typeof muted !== "boolean") return;

      const prev = lastReported.current;
      lastReported.current = { volume, muted };
      if (prev && (prev.volume !== volume || prev.muted !== muted)) {
        writeSettings({ volume, muted });
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [iframeRef]);

  return useCallback(() => {
    const iframe = iframeRef.current;
    lastReported.current = null;
    post(iframe, { event: "listening" });

    const saved = readSettings();
    if (!saved) return;
    post(iframe, { event: "command", func: "setVolume", args: [saved.volume] });
    post(iframe, {
      event: "command",
      func: saved.muted ? "mute" : "unMute",
      args: [],
    });
  }, [iframeRef]);
}
