"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
  useState,
  useTransition,
} from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { ChurchSelect } from "@/components/forms/ChurchSelect";
import { AdminRegistrationSchema } from "@/lib/validation/schemas";

type FormValues = z.input<typeof AdminRegistrationSchema>;

interface TrackOption {
  code: string;
  name: string;
  current_count: number;
  capacity: number;
  is_full: boolean;
}

interface Props {
  tracks: TrackOption[];
}

interface CreateResult {
  ok: boolean;
  referenceNumber?: string;
  error?: string;
}

export function AdminRegistrationForm({ tracks }: Props) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ referenceNumber: string } | null>(
    null,
  );
  const churchErrorId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(AdminRegistrationSchema),
    defaultValues: { track_code: "", how_heard: undefined },
  });

  const selectedCode = watch("track_code");
  const selectedTrack = tracks.find((t) => t.code === selectedCode);

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/registrations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as CreateResult;
      if (data.ok && data.referenceNumber) {
        setSuccess({ referenceNumber: data.referenceNumber });
        reset();
      } else if (data.error === "duplicate") {
        setServerError(
          data.referenceNumber
            ? `Someone is already registered with that email (${data.referenceNumber}).`
            : "Someone is already registered with that email.",
        );
      } else {
        setServerError(
          data.error === "track-not-found"
            ? "That track isn't in the catalogue."
            : (data.error ?? "Something went wrong. Try again."),
        );
      }
    });
  });

  if (success) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/6 p-4">
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
            aria-hidden
          />
          <div>
            <div className="font-display text-sm font-semibold text-navy">
              Registration saved
            </div>
            <div className="mt-1 font-sans text-sm text-navy/70">
              Reference:{" "}
              <span className="font-display font-semibold text-navy">
                {success.referenceNumber}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 font-display text-sm font-semibold text-white hover:bg-primary-700"
          >
            Register another
          </button>
          <Link
            href="/admin/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-full border border-navy/15 bg-white px-6 font-display text-sm font-medium text-navy hover:bg-cream-100"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <p className="text-xs text-navy/55">
        Fields marked with{" "}
        <span aria-hidden className="text-coral">
          *
        </span>{" "}
        are required. Email is optional.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full name" required error={errors.full_name?.message}>
          <input
            className="form-input"
            autoComplete="off"
            aria-required="true"
            {...register("full_name")}
          />
        </Field>
        <Field label="Email (optional)" error={errors.email?.message}>
          <input
            type="email"
            className="form-input"
            autoComplete="off"
            inputMode="email"
            {...register("email")}
          />
        </Field>
        <Field label="Phone" required error={errors.phone?.message}>
          <input
            type="tel"
            className="form-input"
            autoComplete="off"
            inputMode="tel"
            aria-required="true"
            placeholder="08012345678 or +2348012345678"
            {...register("phone")}
          />
        </Field>
        <Field
          label="Church or organisation"
          required
          error={errors.church?.message}
        >
          <ChurchSelect
            value={watch("church")}
            onChange={(v) => setValue("church", v, { shouldValidate: true })}
            hasError={Boolean(errors.church)}
            invalidId={errors.church ? churchErrorId : undefined}
            required
          />
        </Field>
        <Field label="Gender" required error={errors.gender?.message}>
          <select
            className="form-input"
            defaultValue=""
            aria-required="true"
            {...register("gender")}
          >
            <option value="" disabled>
              Pick one…
            </option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </Field>
        <Field label="Age group" required error={errors.age_group?.message}>
          <select
            className="form-input"
            defaultValue=""
            aria-required="true"
            {...register("age_group")}
          >
            <option value="" disabled>
              Pick one…
            </option>
            <option value="under_18">Under 18</option>
            <option value="18_25">18–25</option>
            <option value="26_35">26–35</option>
            <option value="36_plus">36+</option>
          </select>
        </Field>
      </div>

      <Field label="Skill track" required error={errors.track_code?.message}>
        <select
          className="form-input"
          aria-required="true"
          {...register("track_code")}
        >
          <option value="" disabled>
            Pick a track…
          </option>
          {tracks.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name} ({t.current_count}/{t.capacity})
              {t.is_full ? " — full" : ""}
            </option>
          ))}
        </select>
      </Field>

      {selectedTrack?.is_full && (
        <div className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/8 p-3">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-gold-600"
            aria-hidden
          />
          <p className="font-sans text-sm text-navy/75">
            {selectedTrack.name} is full ({selectedTrack.current_count}/
            {selectedTrack.capacity}). You can still add this person.
          </p>
        </div>
      )}

      <Field
        label="How did they hear about us? (optional)"
        error={errors.how_heard?.message}
      >
        <select
          className="form-input"
          defaultValue=""
          {...register("how_heard")}
        >
          <option value="">Pick one…</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="social_media">Social media</option>
          <option value="church">Church</option>
          <option value="friend">Friend</option>
          <option value="other">Other</option>
        </select>
      </Field>

      {serverError && <p className="text-sm text-coral">{serverError}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 font-display font-semibold text-white shadow-lift transition hover:bg-primary-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save registration"}
        </button>
      </div>
    </form>
  );
}

// Small local field wrapper — label + required marker + inline error.
// Uses a <div> (not <label>) and injects aria-labelledby onto the single child
// so HeroUI's ChurchSelect popover isn't toggled by a label-relayed click —
// same approach as the public RegistrationForm's Field.
function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  const labelId = useId();
  const labelled = isValidElement(children)
    ? cloneElement(
        children as ReactElement<{
          "aria-labelledby"?: string;
          "aria-label"?: string;
        }>,
        {
          "aria-labelledby":
            (children.props as { "aria-labelledby"?: string })?.[
              "aria-labelledby"
            ] ?? labelId,
          "aria-label":
            (children.props as { "aria-label"?: string })?.["aria-label"] ??
            label,
        },
      )
    : children;
  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="font-display text-sm font-medium text-navy">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-coral">
            *
          </span>
        )}
      </span>
      {labelled}
      {error && <span className="text-xs text-coral">{error}</span>}
    </div>
  );
}
