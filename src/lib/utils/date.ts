import { tz } from "@date-fns/tz";
import { differenceInSeconds, format } from "date-fns";
import { env } from "./env";

export const LAGOS_TZ = "Africa/Lagos";
export const lagos = tz(LAGOS_TZ);

export function eventStartDate(): Date {
  return new Date(env.NEXT_PUBLIC_EVENT_START_ISO);
}

/**
 * The registration lifecycle, derived purely from the clock:
 *  - `open`       registration form is live (before the close instant)
 *  - `pre-start`  registration closed, event not yet started (countdown to 9am)
 *  - `ongoing`    event is running (start → end)
 *  - `over`       event has ended
 *
 * Comparisons are on absolute instants and the env ISO strings carry `+01:00`,
 * so no timezone math is needed here — only display formatting uses `lagos`.
 */
export type RegistrationPhase = "open" | "pre-start" | "ongoing" | "over";

export function registrationPhase(now: Date = new Date()): RegistrationPhase {
  const close = new Date(env.NEXT_PUBLIC_REGISTRATION_CLOSE_ISO);
  const start = new Date(env.NEXT_PUBLIC_EVENT_START_ISO);
  const end = new Date(env.NEXT_PUBLIC_EVENT_END_ISO);
  if (now >= end) return "over";
  if (now >= start) return "ongoing";
  if (now >= close) return "pre-start";
  return "open";
}

export function isRegistrationOpen(now: Date = new Date()): boolean {
  return registrationPhase(now) === "open";
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  hasStarted: boolean;
}

export function countdownTo(
  target: Date,
  from: Date = new Date(),
): CountdownParts {
  const total = differenceInSeconds(target, from);
  if (total <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      hasStarted: true,
    };
  }
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const seconds = total % 60;
  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds: total,
    hasStarted: false,
  };
}

/**
 * Format a date pinned to Africa/Lagos (the event timezone), regardless of
 * where the code runs. Server renders happen in UTC on Vercel, so a naive
 * toLocaleDateString would show the wrong day around midnight; this keeps
 * every display (and the per-day check-in boundary) on Lagos time.
 */
export function formatDate(date: Date, pattern: string): string {
  return format(date, pattern, { in: lagos });
}
