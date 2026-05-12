import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

let supabase: SupabaseMock;

type SmsResult = { ok: boolean; message?: string; message_id?: string };

const hoisted = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  sendBulkSMS: vi.fn<(...args: unknown[]) => Promise<SmsResult[]>>(
    async () => [],
  ),
}));

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: hoisted.requireRole,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: hoisted.createSupabaseServerClient,
}));

vi.mock("@/lib/sms/termii", () => ({
  sendBulkSMS: hoisted.sendBulkSMS,
}));

import { GET, POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.requireRole.mockResolvedValue({ role: "superadmin", userId: "u1" });
  supabase = createSupabaseMock({
    from: {
      registrations: {
        data: [{ phone: "08011111111" }, { phone: "08022222222" }],
        error: null,
      },
    },
  });
  hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
});

describe("GET /api/admin/sms/broadcast (preview)", () => {
  it("returns the recipient count for audience=all", async () => {
    const res = await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/sms/broadcast?audience=all",
      ),
    );
    const body = await res.json();
    expect(body.recipients).toBe(2);
  });
});

describe("POST /api/admin/sms/broadcast", () => {
  it("rejects an invalid payload", async () => {
    const res = await POST(
      new NextRequest("http://localhost:3000/api/admin/sms/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience: "what", message: "" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects when there are no recipients", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: [], error: null } },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await POST(
      new NextRequest("http://localhost:3000/api/admin/sms/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience: "all", message: "hi" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("calls sendBulkSMS and reports counts on success", async () => {
    hoisted.sendBulkSMS.mockResolvedValueOnce([{ ok: true }, { ok: true }]);
    const res = await POST(
      new NextRequest("http://localhost:3000/api/admin/sms/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience: "all", message: "Hello attendees" }),
      }),
    );
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(2);
    expect(body.failed).toBe(0);
    expect(hoisted.sendBulkSMS).toHaveBeenCalledOnce();
    const arg = hoisted.sendBulkSMS.mock.calls[0]?.[0] as unknown as Array<{
      to: string;
      message: string;
    }>;
    expect(arg.map((r) => r.message)).toEqual([
      "Hello attendees",
      "Hello attendees",
    ]);
  });
});
