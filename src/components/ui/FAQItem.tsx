"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      className={cn(
        "flex w-full cursor-pointer flex-col items-start gap-2 rounded-2xl border border-[var(--color-text-navy)]/8 bg-white p-5 text-left transition",
        open
          ? "shadow-[var(--shadow-card)]"
          : "hover:border-[var(--color-text-navy)]/15",
      )}
    >
      <div className="flex w-full items-center justify-between gap-4">
        <span className="font-display text-base sm:text-lg font-semibold text-[var(--color-text-navy)]">
          {q}
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 transition",
            open
              ? "rotate-180 text-[var(--color-primary-blue)]"
              : "text-[var(--color-text-navy)]/50",
          )}
          aria-hidden
        />
      </div>
      <div
        className={cn(
          "grid w-full overflow-hidden text-sm leading-relaxed text-[var(--color-text-navy)]/70 transition-all",
          open
            ? "grid-rows-[1fr] opacity-100 mt-1"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">{a}</div>
      </div>
    </button>
  );
}
