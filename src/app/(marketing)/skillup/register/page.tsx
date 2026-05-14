import type { Metadata } from "next";
import { RegistrationForm } from "@/components/forms/RegistrationForm";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { TRACKS } from "@/content/tracks";
import { withCapacity } from "@/lib/db/tracks";
import { env } from "@/lib/utils/env";

// `force-dynamic`: the form reads `useSearchParams()` to pre-fill `?track=`,
// which forces a CSR bailout at prerender time. Pre-rendering would buy us
// nothing here since the form is client-interactive on first paint anyway.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Register · SkillUp 1.0",
  description:
    "Register for SkillUp 1.0 - pick your skill track in under two minutes.",
  alternates: { canonical: "/skillup/register" },
  openGraph: {
    title: "Register · SkillUp 1.0",
    description:
      "Reserve your spot at SkillUp 1.0 — three days, 15 tracks, free to attend.",
    url: "/skillup/register",
    type: "website",
  },
};

export default function RegisterPage() {
  // Optimistic seed: every track shows full capacity. The form's useEffect
  // fetches `/api/register/tracks` and replaces this on mount.
  const initialTracks = withCapacity({}, TRACKS);

  return (
    <div className="px-6 sm:px-10 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
            Registration
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight text-navy leading-tight">
            Save your seat at SkillUp 1.0.
          </h1>
          <p className="mt-2 text-base sm:text-lg text-navy/70 max-w-2xl">
            Free to attend. One track, three days, real income skill. Fill the
            short form below - confirmation lands in your inbox in seconds.
          </p>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-navy/55">
            Time to event
          </span>
          <CountdownTimer
            target={env.NEXT_PUBLIC_EVENT_START_ISO}
            variant="compact"
          />
        </div>

        <div className="mt-8">
          <RegistrationForm tracks={initialTracks} />
        </div>
      </div>
    </div>
  );
}
