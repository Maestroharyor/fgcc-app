import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

let supabase: SupabaseMock;
const { createSupabaseServerClient } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

beforeEach(() => {
  supabase = createSupabaseMock();
  createSupabaseServerClient.mockImplementation(async () => supabase);
});

describe("listFeedback", () => {
  it("returns feedback rows", async () => {
    supabase = createSupabaseMock({
      from: {
        feedback: {
          data: [
            {
              id: "f1",
              registration_id: "r1",
              overall_rating: 5,
              track_rating: 5,
              facilitator_rating: 5,
              enjoyed_most: null,
              improvements: null,
              attend_next: null,
              testimony: null,
              share_as_testimonial: false,
              created_at: "2026-06-15T10:00:00Z",
            },
          ],
          error: null,
        },
      },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { listFeedback } = await import("./feedback");
    const result = await listFeedback();
    expect(result).toHaveLength(1);
    expect(result[0].overall_rating).toBe(5);
    const order = supabase._calls
      .at(-1)
      ?.filters.find((f) => f.method === "order");
    expect(order?.args).toEqual(["created_at", { ascending: false }]);
  });

  it("returns [] on error", async () => {
    supabase = createSupabaseMock({
      from: { feedback: { data: null, error: { message: "boom" } } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { listFeedback } = await import("./feedback");
    expect(await listFeedback()).toEqual([]);
  });
});
