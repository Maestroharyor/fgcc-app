import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FeedbackForm } from "@/components/forms/FeedbackForm";

export const metadata: Metadata = {
  title: "Feedback · SkillUp 1.0",
  description:
    "Tell us what worked and what to improve for SkillUp 2.0. Post-event feedback for confirmed SkillUp 1.0 attendees.",
  // Token-gated, only meaningful with a ref number from a confirmed registration.
  robots: { index: false, follow: false },
};

export default function FeedbackPage() {
  return (
    <div className="px-6 sm:px-10 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
          Post-event
        </span>
        <h1 className="mt-2 font-display text-3xl sm:text-5xl font-semibold tracking-tight text-navy leading-tight">
          How was SkillUp 1.0?
        </h1>
        <p className="mt-2 text-base sm:text-lg text-navy/70">
          Three minutes of feedback shapes SkillUp 2.0. Honest is best - we read
          every response.
        </p>
        <div className="mt-8">
          <Suspense fallback={null}>
            <FeedbackForm />
          </Suspense>
        </div>
        <p className="mt-6 text-sm text-navy/60">
          Not here to rate the event?{" "}
          <Link
            href="/feedback"
            className="font-medium text-primary hover:text-primary-700"
          >
            Send a general enquiry instead →
          </Link>
        </p>
      </div>
    </div>
  );
}
