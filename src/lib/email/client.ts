import { Resend } from "resend";
import { env } from "@/lib/utils/env";

let cached: Resend | null = null;

export function resendClient(): Resend {
  if (cached) return cached;
  if (!env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not configured. Set it in your environment.",
    );
  }
  cached = new Resend(env.RESEND_API_KEY);
  return cached;
}

export function isEmailConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY);
}
