import { useCallback, useEffect, useState, type ReactNode } from "react";

interface ModalProps {
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  /** Tailwind max-width class for the panel. */
  maxWidth?: string;
  /** Receives a close function that plays the exit animation first. */
  children: (close: () => void) => ReactNode;
}

/** Centered dialog with a blurred backdrop; Escape or a backdrop click closes it. */
export default function Modal({
  onClose,
  label,
  maxWidth = "max-w-2xl",
  children,
}: ModalProps) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  const animateClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setVisible(false);
    setTimeout(onClose, 200);
  }, [closing, onClose]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") animateClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [animateClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={animateClose}
    >
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`relative bg-bg-card border border-border rounded-2xl w-full ${maxWidth} max-h-[80vh] flex flex-col shadow-2xl transition-all duration-200 ${
          visible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children(animateClose)}
      </div>
    </div>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
      aria-label="Close"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );
}
