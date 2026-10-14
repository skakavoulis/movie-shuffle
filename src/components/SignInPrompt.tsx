import { useRouter } from "next/router";
import Modal, { CloseButton } from "@/components/Modal";
import { rememberReturnPath } from "@/lib/authReturn";

interface SignInPromptProps {
  title: string;
  message: string;
  /** Where to land after signing in, e.g. the current page plus a hash. */
  returnTo: string;
  onClose: () => void;
}

/** Asks a signed-out visitor to sign in or create an account, then brings them back. */
export default function SignInPrompt({
  title,
  message,
  returnTo,
  onClose,
}: SignInPromptProps) {
  const router = useRouter();

  return (
    <Modal onClose={onClose} label={title} maxWidth="max-w-md">
      {(close) => (
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-bold text-text-primary">{title}</h2>
            <CloseButton onClick={close} />
          </div>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            {message}
          </p>
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={close}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={() => {
                rememberReturnPath(returnTo);
                router.push("/auth");
              }}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover text-white transition-colors"
            >
              Sign in or create account
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
