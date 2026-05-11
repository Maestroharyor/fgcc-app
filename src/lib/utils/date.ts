import { tz } from "@date-fns/tz";
import { differenceInSeconds, format } from "date-fns";
import { env } from "./env";

export const LAGOS_TZ = "Africa/Lagos";
export const lagos = tz(LAGOS_TZ);

export function eventStartDate(): Date {
  return new Date(env.NEXT_PUBLIC_EVENT_START_ISO);
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

export function formatInLagos(date: Date, pattern: string): string {
  return format(date, pattern, { in: lagos });
}
