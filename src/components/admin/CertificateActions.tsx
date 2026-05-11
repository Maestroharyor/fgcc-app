"use client";

import { Download, Mail } from "lucide-react";
import { useState, useTransition } from "react";

interface Props {
  reference?: string;
  bulk?: boolean;
}

export function CertificateActions({ reference, bulk }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const onSend = () => {
    const isBulk = Boolean(bulk);
    const confirmed = window.confirm(
      isBulk
        ? "Send certificate emails to ALL checked-in attendees with a valid email?"
        : `Send certificate to ${reference}?`,
    );
    if (!confirmed) return;
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/certificates/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isBulk ? { all: true } : { reference_number: reference },
        ),
      });
      const data = (await res.json()) as {
        ok: boolean;
        sent?: number;
        skipped?: number;
        error?: string;
      };
      if (data.ok) {
        setMessage(
          `Sent ${data.sent ?? 1}${data.skipped ? ` · skipped ${data.skipped}` : ""}`,
        );
      } else {
        setMessage(data.error ?? "Failed");
      }
    });
  };

  if (bulk) {
    return (
      <button
        type="button"
        onClick={onSend}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-coral px-4 py-2 font-display text-sm font-semibold text-white hover:bg-coral/90 disabled:opacity-60"
      >
        <Mail className="h-4 w-4" aria-hidden />
        {pending ? "Sending…" : "Send to ALL attendees"}
        {message && <span className="text-xs opacity-90">· {message}</span>}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={`/api/admin/certificates/download?ref=${reference}`}
        download
        className="inline-flex items-center gap-1.5 rounded-full border border-navy/15 bg-white px-3 py-1 font-display text-xs font-semibold text-navy hover:bg-cream-100"
      >
        <Download className="h-3.5 w-3.5" aria-hidden /> PDF
      </a>
      <button
        type="button"
        onClick={onSend}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-3 py-1 font-display text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-60"
      >
        <Mail className="h-3.5 w-3.5" aria-hidden />{" "}
        {pending ? "Sending…" : "Send"}
      </button>
      {message && <span className="text-xs text-navy/60">{message}</span>}
    </div>
  );
}
