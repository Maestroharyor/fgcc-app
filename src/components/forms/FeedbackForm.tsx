"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Star } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  cloneElement,
  isValidElement,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import type { z } from "zod";
import { submitFeedbackAction } from "@/app/(marketing)/skillup/feedback/actions";
import { FeedbackSchema } from "@/lib/validation/schemas";

// RHF wants the schema's INPUT type (before transforms / defaults) so the
// optional-vs-required tagging lines up between defaults and the resolver.
type FeedbackFormValues = z.input<typeof FeedbackSchema>;

const FIELD_LABELS: Record<string, string> = {
  reference_number: "Reference number",
  full_name: "Full name",
  email: "Email",
  overall_rating: "Overall rating",
  track_rating: "Track quality",
  facilitator_rating: "Facilitator",
  enjoyed_most: "What did you enjoy most?",
  improvements: "What could be improved?",
  attend_next: "Would you attend SkillUp 2.0?",
  testimony: "Testimony / extra comment",
  share_as_testimonial: "Testimonial consent",
};

function flattenErrors(
  errors: FieldErrors,
): Array<{ key: string; message: string }> {
  return Object.entries(errors)
    .filter(([, v]) => Boolean(v && (v as { message?: string }).message))
    .map(([k, v]) => ({
      key: k,
      message: `${FIELD_LABELS[k] ?? k}: ${(v as { message?: string }).message}`,
    }));
}

export function FeedbackForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialRef = params.get("ref") ?? "";
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const summaryRef = useRef<HTMLDivElement | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FeedbackFormValues>({
    resolver: zodResolver(FeedbackSchema),
    defaultValues: {
      // Name & email is the default lookup. Any ?ref= from the feedback link is
      // still prefilled, so switching to the reference tab needs no retyping.
      lookup: "email",
      reference_number: initialRef,
      full_name: "",
      email: "",
      overall_rating: undefined,
      track_rating: undefined,
      facilitator_rating: undefined,
      share_as_testimonial: false,
    },
  });

  const lookup = watch("lookup") ?? "email";

  const onSubmit = handleSubmit(
    (values) => {
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
    },
    () => {
      requestAnimationFrame(() => summaryRef.current?.focus());
    },
  );

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
      noValidate
      className="flex flex-col gap-6 rounded-3xl border border-navy/8 bg-white p-6 sm:p-8 shadow-card"
    >
      <p className="text-xs text-navy/55">
        Fields marked with{" "}
        <span aria-hidden className="text-coral">
          *
        </span>{" "}
        are required.
      </p>
      <ErrorSummary errors={errors} summaryRef={summaryRef} />

      <div>
        <span className="block font-sans text-[10px] uppercase tracking-[0.18em] text-navy/60">
          Find your registration
        </span>
        <div className="mt-2 flex w-full rounded-full border border-navy/12 bg-navy/5 p-1">
          {(
            [
              ["email", "Name & email"],
              ["reference", "Reference number"],
            ] as const
          ).map(([value, labelText]) => {
            const active = lookup === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setValue("lookup", value)}
                aria-pressed={active}
                className={`flex-1 rounded-full px-4 py-2 font-display text-sm font-semibold transition ${
                  active
                    ? "bg-white text-navy shadow-sm"
                    : "text-navy/60 hover:text-navy"
                }`}
              >
                {labelText}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hidden control keeps `lookup` in the form payload. */}
      <input type="hidden" {...register("lookup")} />

      {lookup === "reference" ? (
        <Field
          label="Your reference number"
          required
          error={errors.reference_number?.message}
          hint="Looks like SKU-UXD-001 — check your confirmation email."
        >
          <input
            className="form-input"
            autoComplete="off"
            aria-required="true"
            placeholder="SKU-XXX-000"
            {...register("reference_number")}
          />
        </Field>
      ) : (
        <>
          <Field
            label="Your full name"
            required
            error={errors.full_name?.message}
          >
            <input
              className="form-input"
              autoComplete="name"
              aria-required="true"
              placeholder="Jane Doe"
              {...register("full_name")}
            />
          </Field>
          <Field
            label="Your email"
            required
            error={errors.email?.message}
            hint="The email you registered with."
          >
            <input
              className="form-input"
              type="email"
              autoComplete="email"
              aria-required="true"
              placeholder="you@example.com"
              {...register("email")}
            />
          </Field>
        </>
      )}

      <button
        type="button"
        onClick={() =>
          setValue("lookup", lookup === "reference" ? "email" : "reference")
        }
        className="-mt-2 self-start text-left text-xs font-medium text-primary hover:underline"
      >
        {lookup === "reference"
          ? "Don't have it? Use your name & email instead"
          : "Have your reference number? Use it instead"}
      </button>

      <RatingField
        label="Overall rating"
        required
        value={watch("overall_rating")}
        error={errors.overall_rating?.message}
        onChange={(n) =>
          setValue("overall_rating", n, { shouldValidate: true })
        }
      />
      <RatingField
        label="Track quality"
        required
        value={watch("track_rating")}
        error={errors.track_rating?.message}
        onChange={(n) => setValue("track_rating", n, { shouldValidate: true })}
      />
      <RatingField
        label="Facilitator"
        required
        value={watch("facilitator_rating")}
        error={errors.facilitator_rating?.message}
        onChange={(n) =>
          setValue("facilitator_rating", n, { shouldValidate: true })
        }
      />

      <Field
        label="What did you enjoy most? (optional)"
        error={errors.enjoyed_most?.message}
      >
        <textarea
          className="form-input"
          rows={3}
          autoComplete="off"
          {...register("enjoyed_most")}
        />
      </Field>
      <Field
        label="What could be improved? (optional)"
        error={errors.improvements?.message}
      >
        <textarea
          className="form-input"
          rows={3}
          autoComplete="off"
          {...register("improvements")}
        />
      </Field>

      <Field
        label="Would you attend SkillUp 2.0? (optional)"
        error={errors.attend_next?.message}
      >
        <select
          className="form-input"
          autoComplete="off"
          {...register("attend_next")}
        >
          <option value="">Pick one</option>
          <option value="yes">Yes</option>
          <option value="maybe">Maybe</option>
          <option value="no">No</option>
        </select>
      </Field>

      <Field
        label="Anything else? Share a testimony or quote. (optional)"
        error={errors.testimony?.message}
      >
        <textarea
          className="form-input"
          rows={3}
          autoComplete="off"
          {...register("testimony")}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-navy/75">
        <input
          type="checkbox"
          className="h-4 w-4"
          {...register("share_as_testimonial")}
        />
        It’s OK to share my testimony publicly with attribution.
      </label>

      {serverError && (
        <p role="alert" className="text-sm text-coral">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 font-display font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit feedback"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  hint,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  const labelId = useId();
  const labelled = isValidElement(children)
    ? cloneElement(
        children as React.ReactElement<{
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
      <span
        id={labelId}
        className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/60"
      >
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-coral">
            *
          </span>
        )}
      </span>
      {labelled}
      {hint && <span className="text-[11px] text-navy/55">{hint}</span>}
      {error && (
        <span role="alert" className="text-xs text-coral">
          {error}
        </span>
      )}
    </div>
  );
}

function ErrorSummary({
  errors,
  summaryRef,
}: {
  errors: FieldErrors;
  summaryRef: React.RefObject<HTMLDivElement | null>;
}) {
  const items = flattenErrors(errors);
  if (items.length === 0) return null;
  return (
    <div
      ref={summaryRef}
      tabIndex={-1}
      role="alert"
      className="rounded-2xl border border-coral/30 bg-coral/8 p-4 outline-none focus:ring-2 focus:ring-coral/40"
    >
      <div className="flex items-center gap-2 font-sans text-[10px] uppercase tracking-[0.18em] text-coral">
        <AlertCircle className="h-3.5 w-3.5" aria-hidden />
        <span>Please fix the following</span>
      </div>
      <ul className="mt-2 list-disc pl-5 text-sm text-navy/80 space-y-0.5">
        {items.map((item) => (
          <li key={item.key}>{item.message}</li>
        ))}
      </ul>
    </div>
  );
}

function RatingField({
  label,
  required,
  value,
  error,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: number | undefined;
  error?: string;
  onChange: (value: number) => void;
}) {
  return (
    <fieldset className="border-0 p-0 m-0">
      <legend className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/60">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-coral">
            *
          </span>
        )}
      </legend>
      <div className="mt-2 flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = value !== undefined && n <= value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-label={`${n} of 5`}
              aria-pressed={filled}
              className={`grid h-10 w-10 place-items-center rounded-xl transition ${
                filled
                  ? "bg-gold text-white"
                  : "bg-navy/8 text-navy/55 hover:bg-navy/12"
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
      {error && (
        <span role="alert" className="mt-1.5 block text-xs text-coral">
          {error}
        </span>
      )}
    </fieldset>
  );
}
