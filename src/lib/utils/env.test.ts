import { describe, expect, it } from "vitest";
import { adminNotificationEmails, env, requireEnv } from "./env";

describe("env", () => {
  it("exposes defaults for vars with `.default()` schemas", () => {
    expect(env.NEXT_PUBLIC_SITE_URL).toBeDefined();
    expect(env.TERMII_SENDER_ID).toBeTruthy();
    expect(env.RESEND_FROM).toContain("@");
    expect(env.NEXT_PUBLIC_EVENT_START_ISO).toMatch(/^\d{4}-/);
  });

  it("treats optional vars as either undefined or non-empty strings", () => {
    // Optional Supabase / Resend / Termii / cron keys may be absent in CI.
    // The schema marks them `.optional()` so they're either a non-empty
    // string or undefined — never an empty string.
    for (const v of [
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      env.RESEND_API_KEY,
      env.TERMII_API_KEY,
      env.CRON_SECRET,
    ]) {
      expect(v === undefined || (typeof v === "string" && v.length > 0)).toBe(
        true,
      );
    }
  });
});

describe("requireEnv", () => {
  it("returns the value when present", () => {
    expect(requireEnv("NEXT_PUBLIC_SITE_URL")).toEqual(
      env.NEXT_PUBLIC_SITE_URL,
    );
  });

  it("throws when the value is empty", () => {
    const original = env.ADMIN_NOTIFICATION_EMAILS;
    (env as { ADMIN_NOTIFICATION_EMAILS: string }).ADMIN_NOTIFICATION_EMAILS =
      "";
    expect(() => requireEnv("ADMIN_NOTIFICATION_EMAILS")).toThrow(
      /Missing required environment variable/,
    );
    (env as { ADMIN_NOTIFICATION_EMAILS: string }).ADMIN_NOTIFICATION_EMAILS =
      original;
  });
});

describe("adminNotificationEmails", () => {
  it("is an array (may be empty when env var is empty)", () => {
    expect(Array.isArray(adminNotificationEmails)).toBe(true);
  });
});
