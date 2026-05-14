"use client";

import { type Key, ListBox, Select } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2 } from "lucide-react";
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
import { submitEnquiryAction } from "@/app/(marketing)/feedback/actions";
import { cn } from "@/lib/utils/cn";
import { EnquirySchema } from "@/lib/validation/schemas";

type EnquiryFormValues = z.input<typeof EnquirySchema>;

const TOPIC_OPTIONS = [
  { value: "registration", label: "Registration help" },
  { value: "track", label: "Question about a specific track" },
  { value: "church", label: "Church / pastoral enquiry" },
  { value: "partnership", label: "Partnership / sponsorship" },
  { value: "feedback", label: "General feedback" },
  { value: "other", label: "Other" },
] as const;

const FIELD_LABELS: Record<string, string> = {
  full_name: "Full name",
  email: "Email",
  phone: "Phone",
  topic: "Topic",
  subject: "Subject",
  message: "Message",
  consent: "Consent",
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

const TRIGGER_CLASS =
  "h-11 w-full rounded-xl border border-navy/12 bg-white px-3.5 font-sans text-sm text-navy flex items-center justify-between gap-2 data-[focused]:border-primary/40 data-[focused]:ring-2 data-[focused]:ring-primary/15";

const LISTBOX_ITEM_CLASS =
  "rounded-md data-[selected]:bg-primary/8 data-[selected]:text-primary data-[hovered]:bg-cream-100 data-[focused]:bg-cream-100 data-[disabled]:opacity-50";

const MESSAGE_MAX = 2000;

export function EnquiryForm() {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ subject: string } | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<EnquiryFormValues>({
    resolver: zodResolver(EnquirySchema),
    defaultValues: { consent: false as unknown as true },
  });

  const onSubmit = handleSubmit(
    (values) => {
      setServerError(null);
      startTransition(async () => {
        const result = await submitEnquiryAction(values);
        if (result.ok) {
          setSubmitted({ subject: values.subject });
          reset();
        } else {
          setServerError(result.message ?? "Something went wrong. Try again.");
        }
      });
    },
    () => {
      requestAnimationFrame(() => summaryRef.current?.focus());
    },
  );

  if (submitted) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 sm:p-10 text-center">
        <CheckCircle2
          className="mx-auto h-10 w-10 text-emerald-600"
          aria-hidden
        />
        <h2 className="mt-3 font-display text-2xl font-semibold text-emerald-900">
          Thanks - message received.
        </h2>
        <p className="mt-2 text-sm text-emerald-800">
          We sent a receipt to your inbox. The SkillUp team will respond within
          24 hours about "{submitted.subject}".
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(null)}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-full border border-emerald-300 bg-white px-4 font-display text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  const messageValue = watch("message") ?? "";

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full name" required error={errors.full_name?.message}>
          <input
            className="form-input"
            autoComplete="name"
            aria-required="true"
            {...register("full_name")}
          />
        </Field>
        <Field label="Email" required error={errors.email?.message}>
          <input
            type="email"
            className="form-input"
            autoComplete="email"
            inputMode="email"
            aria-required="true"
            {...register("email")}
          />
        </Field>
        <Field
          label="Phone (optional)"
          error={errors.phone?.message}
          hint="We'll only call if your enquiry needs it."
        >
          <input
            type="tel"
            className="form-input"
            autoComplete="tel"
            inputMode="tel"
            placeholder="08012345678 or +2348012345678"
            {...register("phone")}
          />
        </Field>
        <Field label="Topic" required error={errors.topic?.message}>
          <TopicSelect
            value={watch("topic")}
            onChange={(v) =>
              setValue("topic", v as EnquiryFormValues["topic"], {
                shouldValidate: true,
              })
            }
          />
        </Field>
      </div>

      <Field label="Subject" required error={errors.subject?.message}>
        <input
          className="form-input"
          maxLength={120}
          autoComplete="off"
          aria-required="true"
          placeholder="One short line about what you need"
          {...register("subject")}
        />
      </Field>

      <Field
        label="Message"
        required
        error={errors.message?.message}
        hint={
          <span aria-live="polite">
            {messageValue.length} / {MESSAGE_MAX} characters
          </span>
        }
      >
        <textarea
          className="form-input min-h-[8rem]"
          rows={6}
          maxLength={MESSAGE_MAX}
          autoComplete="off"
          aria-required="true"
          placeholder="Tell us a bit about what you need. Include any reference number if you're following up on a registration."
          {...register("message")}
        />
      </Field>

      <label className="flex items-start gap-2 text-sm text-navy/80">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          aria-required="true"
          {...register("consent")}
        />
        <span>
          I'm OK with the SkillUp team contacting me about this enquiry.
          {errors.consent && (
            <span role="alert" className="ml-1 text-xs text-coral">
              {errors.consent.message}
            </span>
          )}
        </span>
      </label>

      {serverError && (
        <p role="alert" className="text-sm text-coral">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-fit items-center justify-center rounded-full bg-primary px-7 font-display font-semibold text-white shadow-lift transition hover:bg-primary-700 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  hint,
  wide,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: React.ReactNode;
  wide?: boolean;
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
    <div className={cn("flex flex-col gap-1.5", wide && "sm:col-span-2")}>
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

function TopicSelect({
  value,
  onChange,
  "aria-labelledby": ariaLabelledBy,
  "aria-label": ariaLabel,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  "aria-labelledby"?: string;
  "aria-label"?: string;
}) {
  return (
    <Select
      className="w-full"
      placeholder="Pick a topic…"
      selectionMode="single"
      value={value ?? null}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      onChange={(key: Key | Key[] | null) => {
        if (typeof key === "string") onChange(key);
        else if (typeof key === "number") onChange(String(key));
        else onChange("");
      }}
    >
      <Select.Trigger className={TRIGGER_CLASS}>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {TOPIC_OPTIONS.map((opt) => (
            <ListBox.Item
              key={opt.value}
              id={opt.value}
              textValue={opt.label}
              className={LISTBOX_ITEM_CLASS}
            >
              {opt.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
