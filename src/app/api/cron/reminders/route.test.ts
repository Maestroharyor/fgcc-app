import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

let supabase: SupabaseMock;

type SmsResult = { ok: boolean; message?: string; message_id?: string };

const hoisted = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  sendReminder3DayEmail: vi.fn(async () => ({ ok: true })),
  sendReminder1DayEmail: vi.fn(async () => ({ ok: true })),
  sendFeedbackRequestEmail: vi.fn(async () => ({ ok: true })),
  sendBulkSMS: vi.fn<(...args: unknown[]) => Promise<SmsResult[]>>(
    async () => [],
  ),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: hoisted.createSupabaseAdminClient,
}));

vi.mock("@/lib/email/send", () => ({
  sendReminder3DayEmail: hoisted.sendReminder3DayEmail,
  sendReminder1DayEmail: hoisted.sendReminder1DayEmail,
  sendFeedbackRequestEmail: hoisted.sendFeedbackRequestEmail,
}));

vi.mock("@/lib/sms/termii", () => ({
  sendBulkSMS: hoisted.sendBulkSMS,
}));

vi.mock("@/lib/utils/env", () => ({
  env: {
    CRON_SECRET: "test-cron-secret",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  },
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.sendBulkSMS.mockResolvedValue([{ ok: true }]);
});

function makeReq(kind: string, withAuth: boolean) {
  return new NextRequest(
    `http://localhost:3000/api/cron/reminders?kind=${kind}`,
    withAuth
      ? { headers: { authorization: "Bearer test-cron-secret" } }
      : undefined,
  );
}

describe("GET /api/cron/reminders", () => {
  it("returns 401 when missing the bearer token", async () => {
    supabase = createSupabaseMock();
    hoisted.createSupabaseAdminClient.mockReturnValue(supabase);
    const res = await GET(makeReq("3day", false));
    expect(res.status).toBe(401);
  });

  it("dispatches 3-day reminders and marks rows", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: [
            {
              id: "r1",
              reference_number: "SKU-UXD-001",
              full_name: "Ada",
              email: "ada@example.com",
              phone: "08012345678",
              attended: false,
              tracks: { name: "UI/UX Design", facilitator_name: "F" },
            },
          ],
          error: null,
        },
      },
    });
    hoisted.createSupabaseAdminClient.mockReturnValue(supabase);

    const res = await GET(makeReq("3day", true));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.kind).toBe("3day");
    expect(body.processed).toBe(1);
    expect(body.emailSent).toBe(1);
    expect(hoisted.sendReminder3DayEmail).toHaveBeenCalledOnce();
    // 3-day kind does not send SMS
    expect(hoisted.sendBulkSMS).not.toHaveBeenCalled();
    // The action also marked the row
    const updateCall = supabase._calls.find(
      (c) =>
        c.table === "registrations" &&
        c.filters.some((f) => f.method === "update"),
    );
    expect(updateCall).toBeDefined();
  });

  it("1-day kind sends both email and SMS", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: [
            {
              id: "r1",
              reference_number: "SKU-UXD-001",
              full_name: "Ada",
              email: "ada@example.com",
              phone: "08012345678",
              attended: false,
              tracks: { name: "UI/UX Design", facilitator_name: "F" },
            },
          ],
          error: null,
        },
      },
    });
    hoisted.createSupabaseAdminClient.mockReturnValue(supabase);

    const res = await GET(makeReq("1day", true));
    const body = await res.json();
    expect(body.kind).toBe("1day");
    expect(hoisted.sendReminder1DayEmail).toHaveBeenCalledOnce();
    expect(hoisted.sendBulkSMS).toHaveBeenCalledOnce();
  });

  it("feedback kind targets attended-only and skips placeholders", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: [
            {
              id: "r1",
              reference_number: "SKU-UXD-001",
              full_name: "Ada",
              email: "ada@example.com",
              phone: "+234801",
              attended: true,
              tracks: { name: "UI/UX Design", facilitator_name: "F" },
            },
            {
              id: "r2",
              reference_number: "SKU-UXD-002",
              full_name: "Placeholder",
              email: "noemail+xxx@placeholder.skillup",
              phone: "+234802",
              attended: true,
              tracks: { name: "UI/UX Design", facilitator_name: "F" },
            },
          ],
          error: null,
        },
      },
    });
    hoisted.createSupabaseAdminClient.mockReturnValue(supabase);
    const res = await GET(makeReq("feedback", true));
    const body = await res.json();
    expect(body.processed).toBe(2);
    expect(body.emailSent).toBe(1);
    expect(hoisted.sendFeedbackRequestEmail).toHaveBeenCalledOnce();
  });

  it("returns 500 when supabase errors out", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: { data: null, error: { message: "down" } },
      },
    });
    hoisted.createSupabaseAdminClient.mockReturnValue(supabase);
    const res = await GET(makeReq("3day", true));
    expect(res.status).toBe(500);
  });
});
