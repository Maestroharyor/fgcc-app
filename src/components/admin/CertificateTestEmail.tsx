"use client";

import { Send } from "lucide-react";
import { useState, useTransition } from "react";

/**
 * Send a sample certificate email to any address so admins can preview the
 * real template + attached PDF before scheduling the live send.
 */
export function CertificateTestEmail() {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const send = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/certificates/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      setOk(data.ok);
      setMessage(
        data.ok
          ? `Sample certificate sent to ${email}.`
          : (data.error ?? "Could not send"),
      );
    });
  };

  return (
    <div className="mt-4 max-w-md rounded-2xl border border-navy/8 bg-white p-5 shadow-card">
      <h3 className="font-display text-base font-semibold text-navy">
        Send a test certificate
      </h3>
      <p className="mt-1 text-sm text-navy/65">
        Preview the email and sample PDF attendees receive. Uses placeholder
        details - nothing is saved.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="form-input"
        />
        <button
          type="button"
          onClick={send}
          disabled={pending || !email}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 font-display text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden />
          {pending ? "Sending…" : "Send test"}
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-sm ${ok ? "text-emerald-700" : "text-coral"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
