"use client";

import { MessageCircle } from "lucide-react";
import { useState, useTransition } from "react";

/**
 * Re-send the "join your track WhatsApp group" email to one registrant.
 * A single reversible email doesn't warrant a confirm modal; feedback is
 * inline next to the button.
 */
export function ResendWhatsAppButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const send = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/registrations/whatsapp-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json().catch(() => ({ ok: false }))) as {
        ok: boolean;
        sent?: number;
        skipped?: number;
        error?: string;
      };
      if (data.ok && (data.sent ?? 0) > 0) {
        setFailed(false);
        setMessage("Reminder sent");
      } else {
        setFailed(true);
        setMessage(
          data.ok
            ? "Skipped - no real email on record"
            : (data.error ?? "Failed"),
        );
      }
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={send}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-4 py-2 font-display text-sm font-semibold text-navy hover:bg-cream-100 disabled:opacity-60"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        {pending ? "Sending…" : "Resend WhatsApp invite"}
      </button>
      {message && (
        <span
          className={`text-xs ${failed ? "text-coral" : "text-emerald-700"}`}
        >
          {message}
        </span>
      )}
    </span>
  );
}
