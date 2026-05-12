"use client";

import {
  Autocomplete,
  EmptyState,
  type Key,
  ListBox,
  SearchField,
  Select,
  toast,
  useFilter,
} from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import type { z } from "zod";
import {
  type ActionResult,
  registerOthersAction,
  registerSelfAction,
} from "@/app/(marketing)/skillup/register/actions";
import type { TrackWithCapacity } from "@/lib/db/types";
import { cn } from "@/lib/utils/cn";
import {
  type OthersRegistrantInput,
  RegisterOthersSchema,
  RegistrationSchema,
} from "@/lib/validation/schemas";

function CapacityErrorNotice() {
  return (
    <div className="rounded-2xl border border-coral/30 bg-coral/8 p-4">
      <div className="font-sans text-[10px] uppercase tracking-[0.18em] text-coral">
        Couldn't confirm live availability
      </div>
      <p className="mt-1 text-sm text-navy/75">
        We couldn't reach the availability service. You can still register, but
        the track you pick may already be full - we'll waitlist you in that case
        and let you know.
      </p>
    </div>
  );
}

// RHF works with the schema's INPUT shape (pre-transform). The action then
// re-parses to get the OUTPUT shape on the server.
type RegistrationFormValues = z.input<typeof RegistrationSchema>;
type RegisterOthersFormValues = z.input<typeof RegisterOthersSchema>;

interface Props {
  tracks: TrackWithCapacity[];
}

type Mode = "self" | "others";

export function RegistrationForm({ tracks: initialTracks }: Props) {
  const [tracks, setTracks] = useState<TrackWithCapacity[]>(initialTracks);
  const [capacitiesLoaded, setCapacitiesLoaded] = useState(false);
  const [capacityFetchFailed, setCapacityFetchFailed] = useState(false);
  const [mode, setMode] = useState<Mode>("self");
  const searchParams = useSearchParams();
  const initialTrack = searchParams.get("track")?.toUpperCase();

  // Fetch live capacities on mount. The page renders instantly with optimistic
  // full-availability seed; once this resolves, dropdowns swap to live counts
  // silently. Submit button stays disabled until either the fetch resolves or
  // it fails (in which case the server action's capacity recheck is the safety
  // net).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/register/tracks", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as TrackWithCapacity[];
        if (!cancelled) {
          setTracks(data);
          setCapacitiesLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setCapacityFetchFailed(true);
          toast.danger("Unable to get availability", {
            description:
              "Refresh to try again, or proceed and we'll waitlist you if the track is full.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-3xl border border-navy/8 bg-white p-6 sm:p-8 shadow-card">
      <ModeToggle mode={mode} setMode={setMode} />
      <div className="mt-8">
        {mode === "self" ? (
          <SelfForm
            tracks={tracks}
            initialTrack={initialTrack}
            capacitiesLoaded={capacitiesLoaded}
            capacityFetchFailed={capacityFetchFailed}
          />
        ) : (
          <OthersForm
            tracks={tracks}
            initialTrack={initialTrack}
            capacitiesLoaded={capacitiesLoaded}
            capacityFetchFailed={capacityFetchFailed}
          />
        )}
      </div>
    </div>
  );
}

function ModeToggle({
  mode,
  setMode,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
}) {
  return (
    <div>
      <div className="font-sans text-[10px] uppercase tracking-[0.18em] text-primary">
        Who are you registering for?
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-full bg-cream-100 p-1 max-w-md">
        <button
          type="button"
          onClick={() => setMode("self")}
          aria-pressed={mode === "self"}
          className={cn(
            "cursor-pointer rounded-full px-4 py-2.5 font-display text-sm font-semibold transition",
            mode === "self"
              ? "bg-white text-navy shadow-sm"
              : "text-navy/60 hover:text-navy",
          )}
        >
          Myself
        </button>
        <button
          type="button"
          onClick={() => setMode("others")}
          aria-pressed={mode === "others"}
          className={cn(
            "cursor-pointer rounded-full px-4 py-2.5 font-display text-sm font-semibold transition",
            mode === "others"
              ? "bg-white text-navy shadow-sm"
              : "text-navy/60 hover:text-navy",
          )}
        >
          Someone else
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Self registration
// ─────────────────────────────────────────────────────────────────────────────

function SelfForm({
  tracks,
  initialTrack,
  capacitiesLoaded,
  capacityFetchFailed,
}: {
  tracks: TrackWithCapacity[];
  initialTrack?: string | null;
  capacitiesLoaded: boolean;
  capacityFetchFailed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{
    referenceNumber: string;
    trackName: string;
    fullName: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(RegistrationSchema),
    defaultValues: {
      track_code: initialTrack ?? tracks.find((t) => !t.is_full)?.code ?? "",
    },
  });

  const emailValue = watch("email");

  // Email blur dedupe probe - non-blocking.
  useEffect(() => {
    if (!emailValue || emailValue.length < 5 || !emailValue.includes("@")) {
      setDuplicate(null);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/register/check?email=${encodeURIComponent(emailValue)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as
          | { found: false }
          | {
              found: true;
              reference_number: string;
              full_name: string;
              track_name: string;
            };
        if (data.found) {
          setDuplicate({
            referenceNumber: data.reference_number,
            trackName: data.track_name,
            fullName: data.full_name,
          });
        } else {
          setDuplicate(null);
        }
      } catch {
        // silent
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [emailValue]);

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const fd = new FormData();
      for (const [k, v] of Object.entries(values)) {
        if (v !== undefined && v !== null) fd.set(k, String(v));
      }
      const result: ActionResult = await registerSelfAction(fd);
      if (result.ok && result.referenceNumber) {
        router.push(`/skillup/register/success?ref=${result.referenceNumber}`);
      } else if (result.error === "duplicate" && result.referenceNumber) {
        router.push(`/skillup/register/success?ref=${result.referenceNumber}`);
      } else {
        setServerError(result.message ?? "Something went wrong. Try again.");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {capacityFetchFailed && <CapacityErrorNotice />}
      {duplicate && (
        <div className="rounded-2xl border border-gold/30 bg-gold/8 p-4">
          <div className="font-sans text-[10px] uppercase tracking-[0.18em] text-gold-600">
            You're already registered
          </div>
          <div className="mt-1 font-display text-sm font-semibold text-navy">
            {duplicate.fullName} · {duplicate.trackName}
          </div>
          <div className="mt-1 font-sans text-sm text-navy/70">
            {duplicate.referenceNumber}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full name" error={errors.full_name?.message}>
          <input className="form-input" {...register("full_name")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input
            type="email"
            className="form-input"
            autoComplete="email"
            {...register("email")}
          />
        </Field>
        <Field label="Phone (WhatsApp preferred)" error={errors.phone?.message}>
          <input
            type="tel"
            className="form-input"
            autoComplete="tel"
            {...register("phone")}
          />
        </Field>
        <Field
          label="Church or organisation (optional)"
          error={errors.church?.message}
        >
          <input className="form-input" {...register("church")} />
        </Field>
        <Field label="Gender" error={errors.gender?.message}>
          <OptionSelect
            options={GENDER_OPTIONS}
            value={watch("gender")}
            onChange={(v) =>
              setValue("gender", v as RegistrationFormValues["gender"], {
                shouldValidate: true,
              })
            }
          />
        </Field>
        <Field label="Age group" error={errors.age_group?.message}>
          <OptionSelect
            options={AGE_GROUP_OPTIONS}
            value={watch("age_group")}
            onChange={(v) =>
              setValue("age_group", v as RegistrationFormValues["age_group"], {
                shouldValidate: true,
              })
            }
          />
        </Field>
      </div>

      <Field label="Skill track" error={errors.track_code?.message}>
        <TrackSelect
          tracks={tracks}
          value={watch("track_code")}
          onChange={(code) =>
            setValue("track_code", code, { shouldValidate: true })
          }
        />
      </Field>

      <Field
        label="How did you hear about us? (optional)"
        error={errors.how_heard?.message}
      >
        <OptionSelect
          placeholder="Pick one…"
          options={HOW_HEARD_OPTIONS}
          value={watch("how_heard")}
          onChange={(v) =>
            setValue("how_heard", v as RegistrationFormValues["how_heard"], {
              shouldValidate: true,
            })
          }
        />
      </Field>

      {serverError && <p className="text-sm text-coral">{serverError}</p>}

      <div className="mt-2 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <p className="text-xs text-navy/55">
          We use your details only for SkillUp 1.0 communications.
        </p>
        <button
          type="submit"
          disabled={
            pending ||
            Boolean(duplicate) ||
            (!capacitiesLoaded && !capacityFetchFailed)
          }
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 font-display font-semibold text-white shadow-lift transition hover:bg-primary-700 disabled:opacity-60"
        >
          {pending ? "Registering…" : "Confirm registration"}
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Register-for-Others
// ─────────────────────────────────────────────────────────────────────────────

function OthersForm({
  tracks,
  initialTrack,
  capacitiesLoaded,
  capacityFetchFailed,
}: {
  tracks: TrackWithCapacity[];
  initialTrack?: string | null;
  capacitiesLoaded: boolean;
  capacityFetchFailed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RegisterOthersFormValues>({
    resolver: zodResolver(RegisterOthersSchema),
    defaultValues: {
      registrants: [
        {
          track_code:
            initialTrack ?? tracks.find((t) => !t.is_full)?.code ?? "",
        } as OthersRegistrantInput,
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "registrants",
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await registerOthersAction(values);
      if (result.ok && result.batchId) {
        router.push(`/skillup/register/success?batch=${result.batchId}`);
      } else {
        setServerError(result.message ?? "Something went wrong. Try again.");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-7">
      {capacityFetchFailed && <CapacityErrorNotice />}
      <div>
        <div className="font-display text-lg font-semibold text-navy">
          Your details
        </div>
        <p className="text-sm text-navy/60 mt-1">
          So we have a point of contact for the people you’re registering.
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Your full name"
            error={errors.submitter?.submitter_name?.message}
          >
            <input
              className="form-input"
              {...register("submitter.submitter_name")}
            />
          </Field>
          <Field
            label="Your email"
            error={errors.submitter?.submitter_email?.message}
          >
            <input
              type="email"
              className="form-input"
              {...register("submitter.submitter_email")}
            />
          </Field>
          <Field
            label="Your phone"
            error={errors.submitter?.submitter_phone?.message}
          >
            <input
              type="tel"
              className="form-input"
              {...register("submitter.submitter_phone")}
            />
          </Field>
          <Field
            label="Relationship to registrants"
            error={errors.submitter?.relationship?.message}
          >
            <OptionSelect
              options={RELATIONSHIP_OPTIONS}
              value={watch("submitter.relationship")}
              onChange={(v) =>
                setValue(
                  "submitter.relationship",
                  v as RegisterOthersFormValues["submitter"]["relationship"],
                  { shouldValidate: true },
                )
              }
            />
          </Field>
          <Field
            label="Church or organisation"
            error={errors.submitter?.church?.message}
            wide
          >
            <input className="form-input" {...register("submitter.church")} />
          </Field>
        </div>
      </div>

      <div className="border-t border-navy/8 pt-7">
        <div className="font-display text-lg font-semibold text-navy">
          People you’re registering
        </div>
        <p className="text-sm text-navy/60 mt-1">
          Add as many as you like, up to 20 in one submission.
        </p>

        <div className="mt-5 flex flex-col gap-5">
          {fields.map((field, index) => (
            <RegistrantBlock
              key={field.id}
              index={index}
              tracks={tracks}
              register={register}
              setValue={setValue}
              watch={watch}
              errors={errors}
              onRemove={fields.length > 1 ? () => remove(index) : undefined}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() =>
            append({
              full_name: "",
              phone: "",
              gender: "male",
              age_group: "18_25",
              track_code: tracks.find((t) => !t.is_full)?.code ?? "",
            } as OthersRegistrantInput)
          }
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-4 py-2 font-display text-sm font-semibold text-navy hover:bg-cream-100"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add another person
        </button>
      </div>

      {serverError && <p className="text-sm text-coral">{serverError}</p>}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <p className="text-xs text-navy/55">
          You receive a summary email; each person with an email gets their own
          confirmation.
        </p>
        <button
          type="submit"
          disabled={pending || (!capacitiesLoaded && !capacityFetchFailed)}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 font-display font-semibold text-white shadow-lift transition hover:bg-primary-700 disabled:opacity-60"
        >
          {pending
            ? "Registering…"
            : `Register ${fields.length} ${fields.length === 1 ? "person" : "people"}`}
        </button>
      </div>
    </form>
  );
}

function RegistrantBlock({
  index,
  tracks,
  register,
  setValue,
  watch,
  errors,
  onRemove,
}: {
  index: number;
  tracks: TrackWithCapacity[];
  register: ReturnType<typeof useForm<RegisterOthersFormValues>>["register"];
  setValue: ReturnType<typeof useForm<RegisterOthersFormValues>>["setValue"];
  watch: ReturnType<typeof useForm<RegisterOthersFormValues>>["watch"];
  errors: ReturnType<
    typeof useForm<RegisterOthersFormValues>
  >["formState"]["errors"];
  onRemove?: () => void;
}) {
  const rErr = errors.registrants?.[index];
  return (
    <div className="rounded-2xl border border-navy/8 bg-cream p-5">
      <div className="flex items-center justify-between">
        <div className="font-sans text-[10px] uppercase tracking-[0.18em] text-primary">
          Registrant {index + 1}
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-navy/60 hover:text-coral"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
          </button>
        )}
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full name" error={rErr?.full_name?.message}>
          <input
            className="form-input"
            {...register(`registrants.${index}.full_name`)}
          />
        </Field>
        <Field label="Phone" error={rErr?.phone?.message}>
          <input
            type="tel"
            className="form-input"
            {...register(`registrants.${index}.phone`)}
          />
        </Field>
        <Field label="Email (optional)" error={rErr?.email?.message}>
          <input
            type="email"
            className="form-input"
            {...register(`registrants.${index}.email`)}
          />
        </Field>
        <Field label="Church (optional)" error={rErr?.church?.message}>
          <input
            className="form-input"
            {...register(`registrants.${index}.church`)}
          />
        </Field>
        <Field label="Gender" error={rErr?.gender?.message}>
          <OptionSelect
            options={GENDER_OPTIONS}
            value={watch(`registrants.${index}.gender`)}
            onChange={(v) =>
              setValue(
                `registrants.${index}.gender`,
                v as OthersRegistrantInput["gender"],
                { shouldValidate: true },
              )
            }
          />
        </Field>
        <Field label="Age group" error={rErr?.age_group?.message}>
          <OptionSelect
            options={AGE_GROUP_OPTIONS}
            value={watch(`registrants.${index}.age_group`)}
            onChange={(v) =>
              setValue(
                `registrants.${index}.age_group`,
                v as OthersRegistrantInput["age_group"],
                { shouldValidate: true },
              )
            }
          />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Skill track" error={rErr?.track_code?.message}>
          <TrackSelect
            tracks={tracks}
            value={watch(`registrants.${index}.track_code`)}
            onChange={(code) =>
              setValue(`registrants.${index}.track_code`, code, {
                shouldValidate: true,
              })
            }
          />
        </Field>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shared form atoms
// ─────────────────────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  wide,
  children,
}: {
  label: string;
  error?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  // Plain <div> wrapper (not <label>) so HeroUI's compositional Select /
  // Autocomplete don't get their popover toggled off by a label-relayed click.
  return (
    <div className={cn("flex flex-col gap-1.5", wide && "sm:col-span-2")}>
      <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/60">
        {label}
      </span>
      {children}
      {error && <span className="text-xs text-coral">{error}</span>}
    </div>
  );
}

// Trigger styling that matches `.form-input` (h-11 + border + rounded-xl) so
// HeroUI Select / Autocomplete sit at the same height as the text inputs and
// share the cream-on-white border treatment.
const TRIGGER_CLASS =
  "h-11 w-full rounded-xl border border-navy/12 bg-white px-3.5 font-sans text-sm text-navy flex items-center justify-between gap-2 data-[focused]:border-primary/40 data-[focused]:ring-2 data-[focused]:ring-primary/15";

function OptionSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <Select
      className="w-full"
      placeholder={placeholder}
      selectionMode="single"
      value={value ?? null}
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
          {options.map((opt) => (
            <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label}>
              {opt.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const;

const AGE_GROUP_OPTIONS = [
  { value: "under_18", label: "Under 18" },
  { value: "18_25", label: "18 – 25" },
  { value: "26_35", label: "26 – 35" },
  { value: "36_plus", label: "36 +" },
] as const;

const HOW_HEARD_OPTIONS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "social_media", label: "Social media" },
  { value: "church", label: "Church / pastor" },
  { value: "friend", label: "A friend" },
  { value: "other", label: "Other" },
] as const;

const RELATIONSHIP_OPTIONS = [
  { value: "pastor", label: "Pastor" },
  { value: "parent", label: "Parent" },
  { value: "friend", label: "Friend" },
  { value: "church_worker", label: "Church worker" },
  { value: "other", label: "Other" },
] as const;

function TrackSelect({
  tracks,
  value,
  onChange,
}: {
  tracks: TrackWithCapacity[];
  value: string | undefined;
  onChange: (code: string) => void;
}) {
  const { contains } = useFilter({ sensitivity: "base" });
  return (
    <Autocomplete
      className="w-full"
      placeholder="Search and pick a track…"
      selectionMode="single"
      value={value ?? null}
      onChange={(key: Key | Key[] | null) => {
        if (typeof key === "string") onChange(key);
        else if (typeof key === "number") onChange(String(key));
        else onChange("");
      }}
    >
      <Autocomplete.Trigger className={TRIGGER_CLASS}>
        <Autocomplete.Value />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField autoFocus name="search" variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search tracks…" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox
            renderEmptyState={() => <EmptyState>No tracks match</EmptyState>}
          >
            {tracks.map((t) => (
              <ListBox.Item
                key={t.code}
                id={t.code}
                textValue={t.name}
                isDisabled={t.is_full}
              >
                <span>
                  {t.name}
                  <span className="ml-2 text-xs text-navy/55">
                    {t.is_full
                      ? "Full (waitlist)"
                      : t.remaining <= 5
                        ? `${t.remaining} left`
                        : `${t.remaining} spots`}
                  </span>
                </span>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}
