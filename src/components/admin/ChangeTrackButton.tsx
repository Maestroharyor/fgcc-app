"use client";

import { ArrowLeftRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionCodeModal } from "./ActionCodeModal";

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

/**
 * Admin track change, gated by an email confirmation code. The server
 * regenerates the reference number for the new track, so the success note
 * surfaces the new one.
 */
export function ChangeTrackButton({ id, currentTrackCode, tracks }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [newReference, setNewReference] = useState<string | null>(null);

  const requestCode = async () => {
    const res = await fetch(`/api/admin/registrations/${id}/track-change`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track_code: selected }),
    });
    return (await res.json().catch(() => ({ ok: false }))) as {
      ok: boolean;
      error?: string;
    };
  };

  const confirm = async (code: string) => {
    const res = await fetch(`/api/admin/registrations/${id}/track-change`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track_code: selected, code }),
    });
    const data = (await res.json().catch(() => ({ ok: false }))) as {
      ok: boolean;
      error?: string;
      reference_number?: string;
    };
    if (data.ok) {
      setNewReference(data.reference_number ?? null);
      setOpen(false);
      setSelected("");
      router.refresh();
    }
    return data;
  };

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
        <ActionCodeModal
          title="Change track"
          description="Moving a registrant issues a NEW reference number for the new track; the old one stops working. A confirmation code goes to your admin email first."
          confirmLabel="Change track"
          canRequest={selected.length > 0}
          onRequestCode={requestCode}
          onConfirm={confirm}
          onClose={() => setOpen(false)}
        >
          <label className="flex flex-col gap-1.5">
            <span className="font-display text-sm font-medium text-navy">
              New track
            </span>
            <select
              className="form-input"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="" disabled>
                Pick a track…
              </option>
              {tracks.map((t) => {
                const isCurrent = t.code === currentTrackCode;
                return (
                  <option
                    key={t.code}
                    value={t.code}
                    disabled={isCurrent || t.is_full}
                  >
                    {t.name}
                    {isCurrent
                      ? " · current"
                      : t.is_full
                        ? " · full"
                        : ` · ${t.remaining} left`}
                  </option>
                );
              })}
            </select>
          </label>
        </ActionCodeModal>
      )}
    </>
  );
}
