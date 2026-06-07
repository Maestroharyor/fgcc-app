"use client";

import { Trash2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useOverlayDismiss } from "@/lib/hooks/use-overlay-dismiss";

interface Props {
  id: string;
  fullName: string;
  reference: string;
}

/**
 * Superadmin-only permanent delete behind a confirmation modal. The route
 * enforces requireRole("superadmin") + RLS; this button is only rendered for
 * superadmins as a UX nicety.
 */
export function DeleteRegistrationButton({ id, fullName, reference }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/registrations/${id}/delete`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({ ok: false }))) as {
        ok: boolean;
        error?: string;
      };
      if (data.ok) {
        router.push("/admin/registrations");
        router.refresh();
        return;
      }
      setError("Could not delete this registration. Try again.");
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-coral/30 bg-white px-4 py-2 font-display text-sm font-semibold text-coral hover:bg-coral/8"
      >
        <Trash2 className="h-4 w-4" aria-hidden /> Delete registration
      </button>
      {open && (
        <ConfirmDeleteModal
          fullName={fullName}
          reference={reference}
          pending={pending}
          error={error}
          onConfirm={confirm}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ConfirmDeleteModal({
  fullName,
  reference,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  fullName: string;
  reference: string;
  pending: boolean;
  error: string | null;
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
              Delete this registration?
            </h2>
            <p className="mt-1.5 text-sm text-navy/65">
              {fullName} ({reference}) will be permanently removed, including
              their check-ins and reference number. This can&apos;t be undone.
            </p>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-coral">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex items-center rounded-full border border-navy/15 bg-white px-4 py-2 font-display text-sm font-semibold text-navy hover:bg-cream-100 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-coral px-4 py-2 font-display text-sm font-semibold text-white hover:bg-coral/90 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {pending ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}
