"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { type CountdownParts, countdownTo } from "@/lib/utils/date";

const ZERO: CountdownParts = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  totalSeconds: 0,
  hasStarted: false,
};

interface Props {
  target: string;
  variant?: "hero" | "compact";
  className?: string;
}

export function CountdownTimer({ target, variant = "hero", className }: Props) {
  const [parts, setParts] = useState<CountdownParts>(ZERO);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const targetDate = new Date(target);
    setMounted(true);
    setParts(countdownTo(targetDate));
    const id = setInterval(() => setParts(countdownTo(targetDate)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const isHero = variant === "hero";

  return (
    <div
      role="timer"
      className={cn(
        "flex items-stretch gap-3 font-mono",
        isHero ? "gap-3 sm:gap-4" : "gap-2",
        className,
      )}
      aria-live="polite"
      aria-label="Time remaining until SkillUp 1.0"
    >
      <Cell
        value={parts.days}
        label="days"
        pad={3}
        variant={variant}
        mounted={mounted}
      />
      <Cell
        value={parts.hours}
        label="hours"
        pad={2}
        variant={variant}
        mounted={mounted}
      />
      <Cell
        value={parts.minutes}
        label="minutes"
        pad={2}
        variant={variant}
        mounted={mounted}
      />
      <Cell
        value={parts.seconds}
        label="seconds"
        pad={2}
        variant={variant}
        mounted={mounted}
      />
    </div>
  );
}

function Cell({
  value,
  label,
  pad,
  variant,
  mounted,
}: {
  value: number;
  label: string;
  pad: number;
  variant: "hero" | "compact";
  mounted: boolean;
}) {
  const isHero = variant === "hero";
  const display = mounted
    ? value.toString().padStart(pad, "0")
    : "0".repeat(pad);
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-[var(--color-primary-blue)]/8 bg-white shadow-[var(--shadow-card)]",
        isHero
          ? "min-w-[5.5rem] sm:min-w-[6.5rem] px-4 py-4 sm:px-5 sm:py-5"
          : "min-w-[3.5rem] px-3 py-2",
      )}
    >
      <span
        className={cn(
          "font-display font-semibold tabular-nums tracking-tight text-[var(--color-text-navy)]",
          isHero ? "text-4xl sm:text-5xl" : "text-xl",
        )}
        suppressHydrationWarning
      >
        {display}
      </span>
      <span
        className={cn(
          "mt-1 font-mono uppercase tracking-[0.18em] text-[var(--color-text-navy)]/55",
          isHero ? "text-[10px] sm:text-xs" : "text-[9px]",
        )}
      >
        {label}
      </span>
    </div>
  );
}
