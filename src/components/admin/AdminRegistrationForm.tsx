"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
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
import { useFieldArray, useForm } from "react-hook-form";
import type { z } from "zod";
import { ChurchSelect } from "@/components/forms/ChurchSelect";
import { useOverlayDismiss } from "@/lib/hooks/use-overlay-dismiss";
import {
  AdminBatchRegistrationSchema,
  type OthersRegistrantInput,
} from "@/lib/validation/schemas";

type FormValues = z.input<typeof AdminBatchRegistrationSchema>;

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

interface RowResult {
  fullName: string;
  trackName: string | null;
  status: "ok" | "duplicate" | "error";
  referenceNumber?: string;
  message?: string;
}

interface CreateResult {
  ok: boolean;
  results?: RowResult[];
  error?: string;
}

const MAX_ROWS = 20;

// Fresh empty row per call: omit the enum/track fields so the controlled selects
// render their placeholder (no pre-selected gender). Cast mirrors the public
// RegistrationForm. A factory (not a shared object) avoids any chance of rows
// sharing a reference across append/reset.
const makeEmptyRow = (): OthersRegistrantInput =>
  ({
    full_name: "",
    email: "",
    phone: "",
    church: "",
  }) as OthersRegistrantInput;

export function AdminRegistrationForm({ tracks }: Props) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [confirmRows, setConfirmRows] = useState<
    FormValues["registrants"] | null
  >(null);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(AdminBatchRegistrationSchema),
    defaultValues: { registrants: [makeEmptyRow()] },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "registrants",
  });

  const trackByCode = (code?: string) =>
    code ? tracks.find((t) => t.code === code) : undefined;

  // Validation passed -> stash the rows and open the confirm modal. The POST
  // only fires when the admin confirms.
  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    setConfirmRows(values.registrants);
  });

  const doSubmit = () => {
    if (!confirmRows) return;
    startTransition(async () => {
      const res = await fetch("/api/admin/registrations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrants: confirmRows }),
      });
      const data = (await res.json().catch(() => ({}))) as CreateResult;
      setConfirmRows(null);
      if (data.ok && data.results) {
        setResults(data.results);
        reset({ registrants: [makeEmptyRow()] });
      } else {
        setServerError(data.error ?? "Something went wrong. Try again.");
      }
    });
  };

  if (results) {
    return <ResultSummary results={results} onReset={() => setResults(null)} />;
  }

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <p className="text-xs text-navy/55">
          Add one or more people. Fields marked with{" "}
          <span aria-hidden className="text-coral">
            *
          </span>{" "}
          are required. Email is optional.
        </p>

        <div className="flex flex-col gap-4">
          {fields.map((field, index) => {
            const rErr = errors.registrants?.[index];
            const rowTrack = trackByCode(
              watch(`registrants.${index}.track_code`),
            );
            return (
              <div
                key={field.id}
                className="rounded-2xl border border-navy/8 bg-cream p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="font-sans text-[10px] uppercase tracking-[0.18em] text-primary">
                    Registrant {index + 1}
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-navy/60 hover:text-coral"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
                    </button>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Full name"
                    required
                    error={rErr?.full_name?.message}
                  >
                    <input
                      className="form-input"
                      autoComplete="off"
                      aria-required="true"
                      {...register(`registrants.${index}.full_name`)}
                    />
                  </Field>
                  <Field label="Email (optional)" error={rErr?.email?.message}>
                    <input
                      type="email"
                      className="form-input"
                      autoComplete="off"
                      inputMode="email"
                      {...register(`registrants.${index}.email`)}
                    />
                  </Field>
                  <Field label="Phone" required error={rErr?.phone?.message}>
                    <input
                      type="tel"
                      className="form-input"
                      autoComplete="off"
                      inputMode="tel"
                      aria-required="true"
                      placeholder="08012345678 or +2348012345678"
                      {...register(`registrants.${index}.phone`)}
                    />
                  </Field>
                  <Field
                    label="Church or organisation"
                    required
                    error={rErr?.church?.message}
                  >
                    <ChurchSelect
                      value={watch(`registrants.${index}.church`)}
                      onChange={(v) =>
                        setValue(`registrants.${index}.church`, v, {
                          shouldValidate: true,
                        })
                      }
                      hasError={Boolean(rErr?.church)}
                      required
                    />
                  </Field>
                  <Field label="Gender" required error={rErr?.gender?.message}>
                    <select
                      className="form-input"
                      value={watch(`registrants.${index}.gender`) ?? ""}
                      aria-required="true"
                      onChange={(e) =>
                        setValue(
                          `registrants.${index}.gender`,
                          e.target.value as OthersRegistrantInput["gender"],
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
                  <Field
                    label="Age group"
                    required
                    error={rErr?.age_group?.message}
                  >
                    <select
                      className="form-input"
                      value={watch(`registrants.${index}.age_group`) ?? ""}
                      aria-required="true"
                      onChange={(e) =>
                        setValue(
                          `registrants.${index}.age_group`,
                          e.target.value as OthersRegistrantInput["age_group"],
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
                </div>

                <div className="mt-4">
                  <Field
                    label="Skill track"
                    required
                    error={rErr?.track_code?.message}
                  >
                    <select
                      className="form-input"
                      value={watch(`registrants.${index}.track_code`) ?? ""}
                      aria-required="true"
                      onChange={(e) =>
                        setValue(
                          `registrants.${index}.track_code`,
                          e.target.value,
                          { shouldValidate: true },
                        )
                      }
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
                  {rowTrack?.is_full && (
                    <div className="mt-2 flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/8 p-3">
                      <AlertTriangle
                        className="mt-0.5 h-4 w-4 shrink-0 text-gold-600"
                        aria-hidden
                      />
                      <p className="font-sans text-sm text-navy/75">
                        {rowTrack.name} is full ({rowTrack.current_count}/
                        {rowTrack.capacity}). You can still add this person.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {fields.length < MAX_ROWS && (
          <button
            type="button"
            onClick={() => append(makeEmptyRow())}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-navy/15 bg-white px-4 py-2 font-display text-sm font-semibold text-navy hover:bg-cream-100"
          >
            <Plus className="h-4 w-4" aria-hidden /> Add another person
          </button>
        )}

        {serverError && <p className="text-sm text-coral">{serverError}</p>}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 font-display font-semibold text-white shadow-lift transition hover:bg-primary-700 disabled:opacity-60"
          >
            Review & save
          </button>
        </div>
      </form>

      {confirmRows && (
        <ConfirmModal
          rows={confirmRows}
          tracks={tracks}
          pending={pending}
          onCancel={() => setConfirmRows(null)}
          onConfirm={doSubmit}
        />
      )}
    </>
  );
}

// ─── Confirmation modal ──────────────────────────────────────────────────────

function ConfirmModal({
  rows,
  tracks,
  pending,
  onCancel,
  onConfirm,
}: {
  rows: FormValues["registrants"];
  tracks: TrackOption[];
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const fullRows = rows.filter((r) =>
    tracks.find((t) => t.code === r.track_code && t.is_full),
  );

  // Escape-to-close + body scroll-lock while open.
  useOverlayDismiss(true, onCancel);
  // Move focus into the dialog on open.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Cancel"
        className="absolute inset-0 bg-navy/50"
        onClick={onCancel}
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
          Confirm {rows.length}{" "}
          {rows.length === 1 ? "registration" : "registrations"}
        </h2>
        <p className="mt-1 text-sm text-navy/65">
          Review before saving. These will be added as offline registrations.
        </p>

        <ul className="mt-4 flex flex-col gap-2">
          {rows.map((r, i) => {
            const track = tracks.find((t) => t.code === r.track_code);
            return (
              <li
                key={`${r.full_name}-${i}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-navy/8 px-3 py-2"
              >
                <span className="truncate font-display text-sm font-medium text-navy">
                  {r.full_name || "(no name)"}
                </span>
                <span className="shrink-0 text-xs text-navy/60">
                  {track?.name ?? r.track_code}
                </span>
              </li>
            );
          })}
        </ul>

        {fullRows.length > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/8 p-3">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-gold-600"
              aria-hidden
            />
            <p className="font-sans text-sm text-navy/75">
              {fullRows.length}{" "}
              {fullRows.length === 1 ? "person is" : "people are"} on a full
              track. They'll be added anyway.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex h-11 items-center justify-center rounded-full border border-navy/15 bg-white px-6 font-display text-sm font-medium text-navy hover:bg-cream-100 disabled:opacity-60"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 font-display text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Confirm & save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Result summary ──────────────────────────────────────────────────────────

function ResultSummary({
  results,
  onReset,
}: {
  results: RowResult[];
  onReset: () => void;
}) {
  const saved = results.filter((r) => r.status === "ok").length;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/6 p-4">
        <CheckCircle2
          className="mt-0.5 h-5 w-5 shrink-0 text-primary"
          aria-hidden
        />
        <div className="font-display text-sm font-semibold text-navy">
          {saved} {saved === 1 ? "registration" : "registrations"} saved
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {results.map((r, i) => (
          <li
            key={`${r.fullName}-${i}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-navy/8 bg-white px-3 py-2"
          >
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-medium text-navy">
                {r.fullName}
              </div>
              <div className="text-xs text-navy/55">{r.trackName ?? "—"}</div>
            </div>
            <div className="shrink-0 text-right">
              {r.status === "ok" && (
                <span className="font-display text-xs font-semibold text-primary">
                  {r.referenceNumber}
                </span>
              )}
              {r.status === "duplicate" && (
                <span className="inline-flex items-center gap-1 text-xs text-gold-600">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Already
                  registered{r.referenceNumber ? ` (${r.referenceNumber})` : ""}
                </span>
              )}
              {r.status === "error" && (
                <span className="inline-flex items-center gap-1 text-xs text-coral">
                  <XCircle className="h-3.5 w-3.5" aria-hidden />{" "}
                  {r.message === "track-not-found"
                    ? "Track not found"
                    : "Not saved"}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 font-display text-sm font-semibold text-white hover:bg-primary-700"
        >
          Add more
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

// ─── Field wrapper ───────────────────────────────────────────────────────────

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
