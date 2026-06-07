"use client";

import { ArrowLeftRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { TrackSelect } from "@/components/forms/TrackSelect";
import { useOverlayDismiss } from "@/lib/hooks/use-overlay-dismiss";

export interface TrackOption {
  code: string;
  name: string;
  remaining: number;
  is_full: boolean;
}

interface Props {
  id: string;
  currentTrackCode: string;
  tracks: TrackOption[];
}

/** Server error codes -> human copy. Unknown codes fall through verbatim. */
const ERROR_COPY: Record<string, string> = {
  "track-full": "That track is now full. Pick another one.",
  "same-track": "The registrant is already on that track.",
  "track-not-found": "That track doesn't exist anymore.",
  "update-failed": "Could not change the track. Try again.",
  "not-found": "This registration no longer exists.",
};

/**
 * Admin track change behind a confirmation modal. The server regenerates the
 * reference number for the new track, so the success note surfaces the new
 * one and the registrant is emailed their updated details.
 */
export function ChangeTrackButton({ id, currentTrackCode, tracks }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newReference, setNewReference] = useState<string | null>(null);

  return (
    <>
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setNewReference(null);
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-4 py-2 font-display text-sm font-semibold text-navy hover:bg-cream-100"
        >
          <ArrowLeftRight className="h-4 w-4" aria-hidden /> Change track
        </button>
        {newReference && (
          <span className="text-xs text-emerald-700">
            Moved · new ref {newReference}
          </span>
        )}
      </span>
      {open && (
        <ChangeTrackModal
          id={id}
          currentTrackCode={currentTrackCode}
          tracks={tracks}
          onDone={(reference) => {
            setNewReference(reference);
            setOpen(false);
            router.refresh();
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ChangeTrackModal({
  id,
  currentTrackCode,
  tracks,
  onDone,
  onClose,
}: Props & {
  onDone: (reference: string | null) => void;
  onClose: () => void;
}) {
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Escape-to-close + body scroll-lock while open.
  useOverlayDismiss(true, onClose);
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/registrations/${id}/track-change`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track_code: selected }),
      });
      const data = (await res.json().catch(() => ({ ok: false }))) as {
        ok: boolean;
        error?: string;
        reference_number?: string;
      };
      if (data.ok) {
        onDone(data.reference_number ?? null);
        return;
      }
      setError(
        (data.error && ERROR_COPY[data.error]) ??
          data.error ??
          "Something went wrong. Try again.",
      );
    });
  };

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
          Change track
        </h2>
        <p className="mt-1 text-sm text-navy/65">
          Moving a registrant issues a NEW reference number for the new track;
          the old one stops working. They&apos;ll be emailed the new reference
          and their new group link.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          {/* div, not label: the searchable select isn't a labelable control. */}
          <div className="flex flex-col gap-1.5">
            <span className="font-display text-sm font-medium text-navy">
              New track
            </span>
            <TrackSelect
              aria-label="New track"
              placeholder="Search and pick a track…"
              value={selected}
              onChange={setSelected}
              options={tracks.map((t) => {
                const isCurrent = t.code === currentTrackCode;
                return {
                  code: t.code,
                  name: t.name,
                  hint: isCurrent
                    ? "current"
                    : t.is_full
                      ? "full"
                      : `${t.remaining} left`,
                  disabled: isCurrent || t.is_full,
                };
              })}
            />
          </div>

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
              onClick={confirm}
              disabled={pending || !selected}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 font-display text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              <ArrowLeftRight className="h-4 w-4" aria-hidden />
              {pending ? "Changing…" : "Change track"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
