import type { Metadata } from "next";
import { Suspense } from "react";
import { RegistrationForm } from "@/components/forms/RegistrationForm";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { TRACKS } from "@/content/tracks";
import { listTrackCapacity } from "@/lib/db/tracks";
import type { DBTrackCapacity } from "@/lib/db/types";
import { env } from "@/lib/utils/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Register · SkillUp 1.0",
  description:
    "Register for SkillUp 1.0 — pick your skill track in under two minutes.",
};

export default async function RegisterPage() {
  const dbCapacity = await listTrackCapacity();

  // Fall back to in-memory tracks if the DB isn't reachable (dev without Supabase).
  const tracks: DBTrackCapacity[] =
    dbCapacity.length > 0
      ? dbCapacity
      : TRACKS.map((t, idx) => ({
          id: `local-${idx}`,
          code: t.code,
          name: t.name,
          category: t.category,
          facilitator_name: t.facilitator,
          glyph_key: t.glyph,
          capacity: t.capacity,
          is_active: true,
          current_count: 0,
          remaining: t.capacity,
          is_full: false,
        }));

  return (
    <div className="px-6 sm:px-10 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            Registration
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight text-navy leading-tight">
            Save your seat at SkillUp 1.0.
          </h1>
          <p className="mt-2 text-base sm:text-lg text-navy/70 max-w-2xl">
            Free to attend. One track, three days, real income skill. Fill the
            short form below — confirmation lands in your inbox in seconds.
          </p>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy/55">
            Time to event
          </span>
          <CountdownTimer
            target={env.NEXT_PUBLIC_EVENT_START_ISO}
            variant="compact"
          />
        </div>

        <div className="mt-8">
          <Suspense fallback={<FormSkeleton />}>
            <RegistrationForm tracks={tracks} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="rounded-3xl border border-navy/8 bg-white p-8 shadow-card animate-pulse">
      <div className="h-4 w-40 bg-navy/10 rounded" />
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {["name", "email", "phone", "church", "gender", "age"].map((key) => (
          <div
            key={`skeleton-field-${key}`}
            className="h-11 rounded-xl bg-navy/6"
          />
        ))}
      </div>
      <div className="mt-6 h-12 w-48 rounded-full bg-navy/10 ml-auto" />
    </div>
  );
}
