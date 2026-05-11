import { z } from "zod";

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url()
    .default("https://register.fgccement.org"),
  NEXT_PUBLIC_EVENT_START_ISO: z.string().default("2026-06-12T09:00:00+01:00"),
});

const ServerEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM: z
    .string()
    .default("SkillUp 1.0 <noreply@skillup.fgccement.org>"),
  ADMIN_NOTIFICATION_EMAILS: z.string().default(""),
  TERMII_API_KEY: z.string().min(1).optional(),
  TERMII_SENDER_ID: z.string().default("SKILLUP"),
  CRON_SECRET: z.string().min(1).optional(),
});

const publicResult = PublicEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_EVENT_START_ISO: process.env.NEXT_PUBLIC_EVENT_START_ISO,
});

if (!publicResult.success) {
  console.warn(
    "[env] Public env validation failed:",
    publicResult.error.flatten().fieldErrors,
  );
}

const serverResult =
  typeof window === "undefined"
    ? ServerEnvSchema.safeParse(process.env)
    : { success: true as const, data: ServerEnvSchema.parse({}) };

if (typeof window === "undefined" && !serverResult.success) {
  console.warn(
    "[env] Server env validation failed:",
    serverResult.error.flatten().fieldErrors,
  );
}

const publicEnv = publicResult.success
  ? publicResult.data
  : PublicEnvSchema.parse({});

const serverEnv = serverResult.success
  ? serverResult.data
  : ServerEnvSchema.parse({});

export const env = {
  ...publicEnv,
  ...serverEnv,
};

export function requireEnv<K extends keyof typeof env>(key: K): string {
  const value = env[key];
  if (value === undefined || value === "") {
    throw new Error(
      `Missing required environment variable: ${String(key)}. Set it in .env.local or your deployment environment.`,
    );
  }
  return String(value);
}

export const adminNotificationEmails = env.ADMIN_NOTIFICATION_EMAILS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
