import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

let supabase: SupabaseMock;

const { createSupabaseAdminClient, sendFeedbackNotificationEmail } = vi.hoisted(
  () => ({
    createSupabaseAdminClient: vi.fn(),
    sendFeedbackNotificationEmail: vi.fn(),
  }),
);

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient,
}));

vi.mock("@/lib/email/send", () => ({
  sendFeedbackNotificationEmail,
}));

import { submitFeedbackAction } from "./actions";

beforeEach(() => {
  supabase = createSupabaseMock();
  createSupabaseAdminClient.mockReturnValue(supabase);
  sendFeedbackNotificationEmail.mockReset();
  sendFeedbackNotificationEmail.mockResolvedValue({ ok: true });
});

const fixtureReg = {
  id: "reg-1",
  full_name: "Ada Obi",
  email: "ada@example.com",
  track_code: "UXD",
  reference_number: "SKU-UXD-001",
};

const validPayload = {
  reference_number: "SKU-UXD-001",
  overall_rating: 5,
  track_rating: 5,
  facilitator_rating: 4,
  enjoyed_most: "Everything",
  attend_next: "yes" as const,
  share_as_testimonial: false,
};

describe("submitFeedbackAction", () => {
  it("rejects an invalid reference number", async () => {
    const result = await submitFeedbackAction({
      ...validPayload,
      reference_number: "abc",
    });
    expect(result.ok).toBe(false);
  });

  it("returns 'Reference not found' when registration is missing", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: null, error: null } },
    });
    createSupabaseAdminClient.mockReturnValue(supabase);
    const result = await submitFeedbackAction(validPayload);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Reference not found");
  });

  it("inserts feedback and notifies admins on the happy path", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: { data: fixtureReg, error: null },
        feedback: { data: null, error: null },
      },
    });
    createSupabaseAdminClient.mockReturnValue(supabase);

    const result = await submitFeedbackAction(validPayload);
    expect(result.ok).toBe(true);

    const insert = supabase._calls.find(
      (c) => c.table === "feedback" && c.operation === "insert",
    );
    expect(insert).toBeDefined();
    expect(
      (insert?.payload as { registration_id: string }).registration_id,
    ).toBe("reg-1");

    expect(sendFeedbackNotificationEmail).toHaveBeenCalledTimes(1);
    expect(sendFeedbackNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ada@example.com",
        referenceNumber: "SKU-UXD-001",
        overallRating: 5,
      }),
    );
  });

  it("resolves the registration by email on the email tab", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: { data: fixtureReg, error: null },
        feedback: { data: null, error: null },
      },
    });
    createSupabaseAdminClient.mockReturnValue(supabase);

    const result = await submitFeedbackAction({
      lookup: "email",
      full_name: "Ada Obi",
      email: "ada@example.com",
      overall_rating: 4,
      track_rating: 4,
      facilitator_rating: 4,
      share_as_testimonial: false,
    });
    expect(result.ok).toBe(true);
    const lookupCall = supabase._calls.find(
      (c) =>
        c.table === "registrations" &&
        c.filters.some((f) => f.method === "eq" && f.args[0] === "email"),
    );
    expect(lookupCall).toBeDefined();
  });

  it("rejects the email tab without a name", async () => {
    const result = await submitFeedbackAction({
      lookup: "email",
      email: "ada@example.com",
      overall_rating: 4,
      track_rating: 4,
      facilitator_rating: 4,
      share_as_testimonial: false,
    });
    expect(result.ok).toBe(false);
  });

  it("does not notify admins when the reference is missing", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: null, error: null } },
    });
    createSupabaseAdminClient.mockReturnValue(supabase);
    await submitFeedbackAction(validPayload);
    expect(sendFeedbackNotificationEmail).not.toHaveBeenCalled();
  });

  it("propagates DB errors as ok:false + message", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: { data: fixtureReg, error: null },
        feedback: { data: null, error: { message: "rls denied" } },
      },
    });
    createSupabaseAdminClient.mockReturnValue(supabase);
    const result = await submitFeedbackAction(validPayload);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("rls denied");
  });
});
