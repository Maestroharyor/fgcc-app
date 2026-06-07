"use client";

import { Download, Eye, Mail, TriangleAlert } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useOverlayDismiss } from "@/lib/hooks/use-overlay-dismiss";

interface Props {
  reference?: string;
  bulk?: boolean;
  /** Download + Send only make sense once the registrant is marked present. */
  attended?: boolean;
}

export function CertificateActions({ reference, bulk, attended }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isBulk = Boolean(bulk);

  const send = () => {
    setConfirming(false);
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

  const modal = confirming && (
    <ConfirmSendModal
      bulk={isBulk}
      reference={reference}
      onConfirm={send}
      onClose={() => setConfirming(false)}
    />
  );

  if (bulk) {
    return (
      <>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-coral px-4 py-2 font-display text-sm font-semibold text-white hover:bg-coral/90 disabled:opacity-60"
        >
          <Mail className="h-4 w-4" aria-hidden />
          {pending ? "Sending…" : "Send to ALL attendees"}
          {message && <span className="text-xs opacity-90">· {message}</span>}
        </button>
        {modal}
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={`/api/admin/certificates/download?ref=${reference}&preview=1`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-navy/15 bg-white px-3 py-1 font-display text-xs font-semibold text-navy hover:bg-cream-100"
      >
        <Eye className="h-3.5 w-3.5" aria-hidden /> Preview
      </a>
      {attended && (
        <>
          <a
            href={`/api/admin/certificates/download?ref=${reference}`}
            download
            className="inline-flex items-center gap-1.5 rounded-full border border-navy/15 bg-white px-3 py-1 font-display text-xs font-semibold text-navy hover:bg-cream-100"
          >
            <Download className="h-3.5 w-3.5" aria-hidden /> PDF
          </a>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-3 py-1 font-display text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-60"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden />{" "}
            {pending ? "Sending…" : "Send"}
          </button>
        </>
      )}
      {message && <span className="text-xs text-navy/60">{message}</span>}
      {modal}
    </div>
  );
}

function ConfirmSendModal({
  bulk,
  reference,
  onConfirm,
  onClose,
}: {
  bulk: boolean;
  reference?: string;
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
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral">
            <TriangleAlert className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2
              id={headingId}
              className="font-display text-lg font-semibold text-navy"
            >
              {bulk ? "Email every attendee?" : `Send to ${reference}?`}
            </h2>
            <p className="mt-1.5 text-sm text-navy/65">
              {bulk
                ? "This emails a certificate to every attendee with a valid email address. Sent emails can't be recalled."
                : "This emails the certificate to the registrant. Sent emails can't be recalled."}
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
            className="inline-flex items-center gap-2 rounded-full bg-coral px-4 py-2 font-display text-sm font-semibold text-white hover:bg-coral/90"
          >
            <Mail className="h-4 w-4" aria-hidden />
            {bulk ? "Send to all" : "Send certificate"}
          </button>
        </div>
      </div>
    </div>
  );
}
