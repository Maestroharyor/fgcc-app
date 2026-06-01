"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { ChurchSelect } from "@/components/forms/ChurchSelect";
import type { AgeGroup, Gender } from "@/lib/db/types";
import { useOverlayDismiss } from "@/lib/hooks/use-overlay-dismiss";
import {
  type UpdateRegistrationInput,
  UpdateRegistrationSchema,
} from "@/lib/validation/schemas";

type FormValues = z.input<typeof UpdateRegistrationSchema>;

interface Props {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  gender: Gender;
  ageGroup: AgeGroup;
  church: string | null;
}

interface UpdateResult {
  ok: boolean;
  error?: string;
}

export function EditRegistrationButton({
  id,
  fullName,
  email,
  phone,
  gender,
  ageGroup,
  church,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-4 py-2 font-display text-sm font-semibold text-navy hover:bg-cream-100"
      >
        <Pencil className="h-4 w-4" aria-hidden /> Edit details
      </button>
      {open && (
        <EditModal
          id={id}
          fullName={fullName}
          email={email}
          phone={phone}
          gender={gender}
          ageGroup={ageGroup}
          church={church}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function EditModal({
  id,
  fullName,
  email,
  phone,
  gender,
  ageGroup,
  church,
  onClose,
}: Props & { onClose: () => void }) {
  const router = useRouter();
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(UpdateRegistrationSchema),
    defaultValues: {
      full_name: fullName,
      email,
      phone: phone ?? "",
      // Guard against any legacy value outside the select options.
      gender: gender === "male" || gender === "female" ? gender : undefined,
      age_group: ageGroup,
      church: church ?? "",
      notify: true,
    },
  });

  // Escape-to-close + body scroll-lock while open.
  useOverlayDismiss(true, onClose);
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  // The notify toggle is only relevant when the email actually changed to a new,
  // real address — the server gates on the same condition.
  const currentEmail = (watch("email") ?? "").trim();
  const emailChanged =
    currentEmail.length > 0 &&
    currentEmail.toLowerCase() !== email.trim().toLowerCase() &&
    !currentEmail.endsWith("@placeholder.skillup");

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as UpdateResult;
      if (data.ok) {
        reset(values);
        onClose();
        router.refresh();
        return;
      }
      setServerError(
        data.error === "email-taken"
          ? "That email is already registered to someone else."
          : "Could not save changes. Try again.",
      );
    });
  });

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
          Edit registrant details
        </h2>
        <p className="mt-1 text-sm text-navy/65">
          Correct the details below. The track and reference number stay the
          same.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-4 flex flex-col gap-4"
          noValidate
        >
          <Field label="Full name" required error={errors.full_name?.message}>
            <input
              className="form-input"
              autoComplete="off"
              aria-required="true"
              {...register("full_name")}
            />
          </Field>
          <Field label="Email" required error={errors.email?.message}>
            <input
              type="email"
              className="form-input"
              autoComplete="off"
              inputMode="email"
              aria-required="true"
              {...register("email")}
            />
          </Field>
          <Field label="Phone (optional)" error={errors.phone?.message}>
            <input
              type="tel"
              className="form-input"
              autoComplete="off"
              inputMode="tel"
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
              required
            />
          </Field>
          <Field label="Gender" required error={errors.gender?.message}>
            <select
              className="form-input"
              value={watch("gender") ?? ""}
              aria-required="true"
              onChange={(e) =>
                setValue(
                  "gender",
                  e.target.value as UpdateRegistrationInput["gender"],
                  { shouldValidate: true },
                )
              }
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
              value={watch("age_group") ?? ""}
              aria-required="true"
              onChange={(e) =>
                setValue(
                  "age_group",
                  e.target.value as UpdateRegistrationInput["age_group"],
                  { shouldValidate: true },
                )
              }
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

          {emailChanged && (
            <label className="flex items-start gap-2 text-sm text-navy/75">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                {...register("notify")}
              />
              <span>
                Email the registrant at the new address to let them know it
                changed.
              </span>
            </label>
          )}

          {serverError && <p className="text-sm text-coral">{serverError}</p>}

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
              type="submit"
              disabled={pending}
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 font-display text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Field wrapper ───────────────────────────────────────────────────────────

// Mirrors AdminRegistrationForm's Field: a <div> (not <label>) that injects
// aria-labelledby onto its child so HeroUI's ChurchSelect popover isn't toggled
// by a label-relayed click.
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
