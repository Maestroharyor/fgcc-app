"use client";

import { MessageCircle, TriangleAlert } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useOverlayDismiss } from "@/lib/hooks/use-overlay-dismiss";

/**
 * Bulk "join your WhatsApp group" reminder to every registrant with a real
 * email. Confirmed via modal because it emails the whole list at once.
 */
export function WhatsAppReminderBulkButton() {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const send = () => {
    setConfirming(false);
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/registrations/whatsapp-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = (await res.json().catch(() => ({ ok: false }))) as {
        ok: boolean;
        sent?: number;
        skipped?: number;
        error?: string;
      };
      if (data.ok) {
        setMessage(
          `Sent ${data.sent ?? 0}${data.skipped ? ` · skipped ${data.skipped}` : ""}`,
        );
      } else {
        setMessage(data.error ?? "Failed");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-4 py-2 font-display text-sm font-semibold text-navy hover:bg-cream-100 disabled:opacity-60"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        {pending ? "Sending…" : "WhatsApp reminder"}
        {message && <span className="text-xs text-navy/60">· {message}</span>}
      </button>
      {confirming && (
        <ConfirmBulkModal
          onConfirm={send}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}

function ConfirmBulkModal({
  onConfirm,
  onClose,
}: {
  onConfirm: () => void;
  onClose: () => void;
}) {
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Escape-to-close + body scroll-lock while open.
  useOverlayDismiss(true, onClose);
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

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
        className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl outline-none"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <TriangleAlert className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2
              id={headingId}
              className="font-display text-lg font-semibold text-navy"
            >
              Email every registrant?
            </h2>
            <p className="mt-1.5 text-sm text-navy/65">
              This sends a "join your track WhatsApp group" reminder to every
              registrant with a valid email address. Sent emails can't be
              recalled.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-full border border-navy/15 bg-white px-4 py-2 font-display text-sm font-semibold text-navy hover:bg-cream-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-display text-sm font-semibold text-white hover:bg-primary-700"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Send to all
          </button>
        </div>
      </div>
    </div>
  );
}
