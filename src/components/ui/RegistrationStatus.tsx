import { ArrowRight, CalendarDays, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import type { RegistrationPhase } from "@/lib/utils/date";
import { env } from "@/lib/utils/env";
import { CountdownTimer } from "./CountdownTimer";

type ClosedPhase = Exclude<RegistrationPhase, "open">;

const COPY: Record<
  ClosedPhase,
  { eyebrow: string; title: string; body: string }
> = {
  "pre-start": {
    eyebrow: "Registration closed",
    title: "Registration has closed.",
    body: "SkillUp 1.0 starts at 9:00am on Friday, June 12. If you registered, your reference code and QR check-in pass are in your inbox - bring them along.",
  },
  ongoing: {
    eyebrow: "Happening now",
    title: "SkillUp 1.0 has started.",
    body: "The programme is running now, June 12 – 14, at the Church Auditorium, Cement HQ. Registration is closed, but walk-ins are welcome to come learn.",
  },
  over: {
    eyebrow: "Event ended",
    title: "SkillUp 1.0 has ended.",
    body: "Thank you for joining us across three days of training. We'd love to hear how it went - your feedback shapes the next edition.",
  },
};

/**
 * Shown in place of the registration form once the time-based gate closes. The
 * caller (the register page) decides the phase server-side; this component only
 * renders the matching message. `pre-start` keeps a live countdown to the 9am
 * start; `over` points people to the feedback form.
 */
export function RegistrationStatus({ phase }: { phase: ClosedPhase }) {
  const copy = COPY[phase];

  return (
    <div className="rounded-3xl border border-navy/8 bg-white p-8 sm:p-12 shadow-card">
      <div className="flex flex-col gap-4">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
          {phase === "over" ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Clock className="h-3.5 w-3.5" aria-hidden />
          )}
          {copy.eyebrow}
        </span>
        <h2 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight text-navy leading-tight">
          {copy.title}
        </h2>
        <p className="text-base sm:text-lg text-navy/70 max-w-2xl leading-relaxed">
          {copy.body}
        </p>
      </div>

      {phase === "pre-start" ? (
        <div className="mt-8 flex flex-col gap-3">
          <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-navy/55">
            Starts in
          </span>
          <CountdownTimer
            target={env.NEXT_PUBLIC_EVENT_START_ISO}
            variant="hero"
          />
        </div>
      ) : null}

      {phase === "over" ? (
        <Link
          href="/skillup/feedback"
          className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-display text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
        >
          Share your feedback
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <div className="mt-8 inline-flex items-center gap-2.5 rounded-full border border-navy/10 bg-cream px-4 py-2 font-sans text-sm text-navy/70">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
          <span className="font-medium tracking-wide">
            June 12 – 14, 2026 · Church Auditorium, Cement HQ
          </span>
        </div>
      )}
    </div>
  );
}
