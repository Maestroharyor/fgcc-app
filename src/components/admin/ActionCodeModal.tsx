"use client";

import { MailCheck } from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { useOverlayDismiss } from "@/lib/hooks/use-overlay-dismiss";

interface StepResult {
  ok: boolean;
  error?: string;
}

interface Props {
  title: string;
  /** Step-1 explainer shown under the title. */
  description: ReactNode;
  /** Extra step-1 content, e.g. a track select or a warning block. */
  children?: ReactNode;
  /** Step-1 gate: disables "Email me a code" until the caller's inputs are valid. */
  canRequest?: boolean;
  /** Confirm button label, e.g. "Change track" / "Delete permanently". */
  confirmLabel: string;
  /** Coral styles the confirm button for destructive actions. */
  tone?: "primary" | "coral";
  onRequestCode: () => Promise<StepResult>;
  onConfirm: (code: string) => Promise<StepResult>;
  onClose: () => void;
}

/** Server error codes -> human copy. Unknown codes fall through verbatim. */
const ERROR_COPY: Record<string, string> = {
  invalid: "That code isn't right. Check your email and try again.",
  expired: "That code has expired. Request a new one.",
  "too-many-attempts": "Too many wrong attempts. Request a new code.",
  "no-code": "No pending code found. Request a new one.",
  "already-used": "That code was already used. Request a new one.",
  "code-mismatch":
    "The code was issued for a different change. Request a new one.",
  "track-full": "That track is now full. Pick another one.",
  "same-track": "The registrant is already on that track.",
  "admin-no-email":
    "Your admin account has no email address to send the code to.",
  "resend-not-configured": "Email isn't configured on this environment.",
};

function friendly(error: string | undefined) {
  if (!error) return "Something went wrong. Try again.";
  return ERROR_COPY[error] ?? error;
}

/**
 * Two-step confirmation modal for sensitive admin actions: step 1 emails a
 * 6-char code to the logged-in admin, step 2 verifies it and runs the action.
 * The caller owns what happens on success (close, refresh, redirect).
 */
export function ActionCodeModal({
  title,
  description,
  children,
  canRequest = true,
  confirmLabel,
  tone = "primary",
  onRequestCode,
  onConfirm,
  onClose,
}: Props) {
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const codeRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<"request" | "verify">("request");
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Escape-to-close + body scroll-lock while open.
  useOverlayDismiss(true, onClose);
  useEffect(() => {
    panelRef.current?.focus();
  }, []);
  useEffect(() => {
    if (step === "verify") codeRef.current?.focus();
  }, [step]);

  const requestCode = () => {
    setError(null);
    startTransition(async () => {
      const result = await onRequestCode();
      if (result.ok) {
        setCode("");
        setStep("verify");
      } else {
        setError(friendly(result.error));
      }
    });
  };

  const confirm = () => {
    const normalised = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(normalised)) {
      setError("Enter the 6-character code from your email.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await onConfirm(normalised);
      if (!result.ok) setError(friendly(result.error));
    });
  };

  const confirmClasses =
    tone === "coral"
      ? "bg-coral hover:bg-coral/90"
      : "bg-primary hover:bg-primary-700";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Cancel"
        className="absolute inset-0 bg-navy/50"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl max-h-[85dvh] overflow-y-auto outline-none"
      >
        <h2
          id={headingId}
          className="font-display text-lg font-semibold text-navy"
        >
          {title}
        </h2>
        <p className="mt-1 text-sm text-navy/65">{description}</p>

        {step === "request" ? (
          <div className="mt-4 flex flex-col gap-4">
            {children}
            {error && <p className="text-sm text-coral">{error}</p>}
            <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="inline-flex h-11 items-center justify-center rounded-full border border-navy/15 bg-white px-6 font-display text-sm font-medium text-navy hover:bg-cream-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={requestCode}
                disabled={pending || !canRequest}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 font-display text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                <MailCheck className="h-4 w-4" aria-hidden />
                {pending ? "Sending…" : "Email me a code"}
              </button>
            </div>
          </div>
        ) : (
          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              confirm();
            }}
          >
            <div className="rounded-xl border border-navy/8 bg-cream/50 p-4 text-sm text-navy/75">
              We emailed a 6-character code to your admin address. It expires in
              10 minutes.
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="font-display text-sm font-medium text-navy">
                Confirmation code
              </span>
              <input
                ref={codeRef}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                autoComplete="one-time-code"
                inputMode="text"
                spellCheck={false}
                placeholder="AB12CD"
                className="form-input text-center font-mono text-lg tracking-[0.4em] uppercase"
              />
            </label>
            {error && <p className="text-sm text-coral">{error}</p>}
            <button
              type="button"
              onClick={requestCode}
              disabled={pending}
              className="self-start text-sm font-display font-medium text-primary hover:underline disabled:opacity-60"
            >
              Resend code
            </button>
            <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="inline-flex h-11 items-center justify-center rounded-full border border-navy/15 bg-white px-6 font-display text-sm font-medium text-navy hover:bg-cream-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || code.trim().length < 6}
                className={`inline-flex h-11 items-center justify-center rounded-full px-6 font-display text-sm font-semibold text-white disabled:opacity-60 ${confirmClasses}`}
              >
                {pending ? "Confirming…" : confirmLabel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
