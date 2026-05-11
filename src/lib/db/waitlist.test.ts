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

describe("listWaitlistForTrack", () => {
  it("returns rows ordered by position", async () => {
    supabase = createSupabaseMock({
      from: {
        waitlist: {
          data: [
            { id: "w1", position: 1, full_name: "A", track_id: "t1" },
            { id: "w2", position: 2, full_name: "B", track_id: "t1" },
          ],
          error: null,
        },
      },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { listWaitlistForTrack } = await import("./waitlist");
    const result = await listWaitlistForTrack("t1");
    expect(result).toHaveLength(2);
    expect(result[0].position).toBe(1);
  });

  it("returns [] on error", async () => {
    supabase = createSupabaseMock({
      from: { waitlist: { data: null, error: { message: "boom" } } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { listWaitlistForTrack } = await import("./waitlist");
    expect(await listWaitlistForTrack("t1")).toEqual([]);
  });
});

describe("nextWaitlistPosition", () => {
  it("returns 1 when the waitlist is empty", async () => {
    supabase = createSupabaseMock({
      from: { waitlist: { data: null, error: null } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { nextWaitlistPosition } = await import("./waitlist");
    expect(await nextWaitlistPosition("t1")).toBe(1);
  });

  it("returns max+1 when entries exist", async () => {
    supabase = createSupabaseMock({
      from: { waitlist: { data: { position: 7 }, error: null } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { nextWaitlistPosition } = await import("./waitlist");
    expect(await nextWaitlistPosition("t1")).toBe(8);
  });
});
