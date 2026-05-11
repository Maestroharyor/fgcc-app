import type { Metadata } from "next";
import { Suspense } from "react";
import { FeedbackForm } from "@/components/forms/FeedbackForm";

export const metadata: Metadata = {
  title: "Feedback · SkillUp 1.0",
};

export default function FeedbackPage() {
  return (
    <div className="px-6 sm:px-10 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-primary-blue)]/15 bg-[var(--color-primary-blue)]/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-primary-blue)]">
          Post-event
        </span>
        <h1 className="mt-2 font-display text-3xl sm:text-5xl font-semibold tracking-tight text-[var(--color-text-navy)] leading-tight">
          How was SkillUp 1.0?
        </h1>
        <p className="mt-2 text-base sm:text-lg text-[var(--color-text-navy)]/70">
          Three minutes of feedback shapes SkillUp 2.0. Honest is best — we read
          every response.
        </p>
        <div className="mt-8">
          <Suspense fallback={null}>
            <FeedbackForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
