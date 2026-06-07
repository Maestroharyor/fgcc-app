"use client";

import { PenLine, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { updateSignatory } from "@/app/(admin)/admin/certificates/actions";

interface Props {
  slot: "chairman" | "convener";
  name: string;
  title: string;
  /** Signed URL of the current signature PNG, if uploaded. */
  imageUrl: string | null;
}

export function SignatoryEditor({ slot, name, title, imageUrl }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("slot", slot);
    setMessage(null);
    startTransition(async () => {
      const res = await updateSignatory(formData);
      setMessage(res.ok ? "Saved" : (res.error ?? "Failed"));
      if (res.ok && fileRef.current) fileRef.current.value = "";
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-navy/8 bg-white p-5 shadow-card"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
          {slot}
        </span>
        {message && (
          <span
            className={`text-xs ${message === "Saved" ? "text-emerald-600" : "text-coral"}`}
          >
            {message}
          </span>
        )}
      </div>

      <div className="mt-3 flex h-20 items-center justify-center rounded-xl border border-dashed border-navy/15 bg-cream-100/60">
        {imageUrl ? (
          // Plain <img>: the signed URL is short-lived, so next/image's
          // optimisation cache would break on re-fetch.
          // biome-ignore lint/performance/noImgElement: signed, short-lived URL
          <img
            src={imageUrl}
            alt={`${slot} signature`}
            className="max-h-16 max-w-[180px] object-contain"
          />
        ) : (
          <span className="inline-flex items-center gap-2 text-xs text-navy/45">
            <PenLine className="h-3.5 w-3.5" aria-hidden /> No signature
            uploaded yet
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/60">
            Name
          </span>
          <input
            name="name"
            defaultValue={name}
            placeholder="e.g. Pastor J. A. Okonkwo"
            className="form-input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/60">
            Title
          </span>
          <input
            name="title"
            defaultValue={title}
            required
            className="form-input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/60">
            Signature PNG (transparent background works best)
          </span>
          <input
            ref={fileRef}
            type="file"
            name="file"
            accept="image/png"
            className="text-xs text-navy/70 file:mr-3 file:rounded-full file:border-0 file:bg-primary/8 file:px-3 file:py-1.5 file:font-display file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/15"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-display text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      >
        <Upload className="h-4 w-4" aria-hidden />
        {pending ? "Saving…" : "Save signatory"}
      </button>
    </form>
  );
}
