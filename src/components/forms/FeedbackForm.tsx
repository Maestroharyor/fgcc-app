"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Star } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { submitFeedbackAction } from "@/app/(marketing)/skillup/feedback/actions";
import { type FeedbackInput, FeedbackSchema } from "@/lib/validation/schemas";

export function FeedbackForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialRef = params.get("ref") ?? "";
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FeedbackInput>({
    resolver: zodResolver(FeedbackSchema),
    defaultValues: {
      reference_number: initialRef,
      overall_rating: 5,
      track_rating: 5,
      facilitator_rating: 5,
      share_as_testimonial: false,
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await submitFeedbackAction(values);
      if (result.ok) {
        setSubmitted(true);
        setTimeout(() => router.push("/skillup"), 1500);
      } else {
        setServerError(result.message ?? "Couldn’t submit your feedback.");
      }
    });
  });

  if (submitted) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center">
        <h2 className="font-display text-2xl font-semibold text-emerald-900">
          Thank you 💛
        </h2>
        <p className="mt-2 text-sm text-emerald-800">
          Your feedback shapes SkillUp 2.0.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-6 rounded-3xl border border-[var(--color-text-navy)]/8 bg-white p-6 sm:p-8 shadow-[var(--shadow-card)]"
    >
      <Field
        label="Your reference number"
        error={errors.reference_number?.message}
      >
        <input className="form-input" {...register("reference_number")} />
      </Field>

      <RatingField
        label="Overall rating"
        value={watch("overall_rating")}
        onChange={(n) => setValue("overall_rating", n)}
      />
      <RatingField
        label="Track quality"
        value={watch("track_rating")}
        onChange={(n) => setValue("track_rating", n)}
      />
      <RatingField
        label="Facilitator"
        value={watch("facilitator_rating")}
        onChange={(n) => setValue("facilitator_rating", n)}
      />

      <Field
        label="What did you enjoy most?"
        error={errors.enjoyed_most?.message}
      >
        <textarea
          className="form-input"
          rows={3}
          {...register("enjoyed_most")}
        />
      </Field>
      <Field
        label="What could be improved?"
        error={errors.improvements?.message}
      >
        <textarea
          className="form-input"
          rows={3}
          {...register("improvements")}
        />
      </Field>

      <Field
        label="Would you attend SkillUp 2.0?"
        error={errors.attend_next?.message}
      >
        <select className="form-input" {...register("attend_next")}>
          <option value="">Pick one</option>
          <option value="yes">Yes</option>
          <option value="maybe">Maybe</option>
          <option value="no">No</option>
        </select>
      </Field>

      <Field
        label="Anything else? Share a testimony or quote."
        error={errors.testimony?.message}
      >
        <textarea className="form-input" rows={3} {...register("testimony")} />
      </Field>

      <label className="flex items-center gap-2 text-sm text-[var(--color-text-navy)]/75">
        <input
          type="checkbox"
          className="h-4 w-4"
          {...register("share_as_testimonial")}
        />
        It’s OK to share my testimony publicly with attribution.
      </label>

      {serverError && (
        <p className="text-sm text-[var(--color-accent-coral)]">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--color-primary-blue)] px-7 font-display font-semibold text-white hover:bg-[var(--color-primary-blue-700)] disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit feedback"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the input is the children prop — nested-input pattern is valid.
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-navy)]/60">
        {label}
      </span>
      {children}
      {error && (
        <span className="text-xs text-[var(--color-accent-coral)]">
          {error}
        </span>
      )}
    </label>
  );
}

function RatingField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-navy)]/60">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-label={`${n} of 5`}
              className={`grid h-10 w-10 place-items-center rounded-xl transition ${
                filled
                  ? "bg-[var(--color-warm-gold)] text-white"
                  : "bg-[var(--color-text-navy)]/8 text-[var(--color-text-navy)]/55 hover:bg-[var(--color-text-navy)]/12"
              }`}
            >
              <Star
                className="h-4 w-4"
                aria-hidden
                fill={filled ? "currentColor" : "none"}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
