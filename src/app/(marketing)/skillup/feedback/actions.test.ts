import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

let supabase: SupabaseMock;

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient,
}));

import { submitFeedbackAction } from "./actions";

beforeEach(() => {
  supabase = createSupabaseMock();
  createSupabaseAdminClient.mockReturnValue(supabase);
});

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

  it("inserts feedback on the happy path", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: { data: { id: "reg-1" }, error: null },
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
  });

  it("propagates DB errors as ok:false + message", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: { data: { id: "reg-1" }, error: null },
        feedback: { data: null, error: { message: "rls denied" } },
      },
    });
    createSupabaseAdminClient.mockReturnValue(supabase);
    const result = await submitFeedbackAction(validPayload);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("rls denied");
  });
});
