import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRACKS } from "@/content/tracks";
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

describe("getTrackCounts", () => {
  it("returns a Record keyed by track_code from v_track_counts", async () => {
    supabase = createSupabaseMock({
      from: {
        v_track_counts: {
          data: [
            { track_code: "UXD", current_count: 3 },
            { track_code: "CWD", current_count: 17 },
          ],
          error: null,
        },
      },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { getTrackCounts } = await import("./tracks");
    const result = await getTrackCounts();
    expect(result).toEqual({ UXD: 3, CWD: 17 });
  });

  it("returns {} on error", async () => {
    supabase = createSupabaseMock({
      from: { v_track_counts: { data: null, error: { message: "boom" } } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { getTrackCounts } = await import("./tracks");
    expect(await getTrackCounts()).toEqual({});
  });
});

describe("withCapacity", () => {
  it("merges static track metadata with counts and computes remaining/is_full", async () => {
    const { withCapacity } = await import("./tracks");
    const result = withCapacity({ UXD: 5 });
    const uxd = result.find((r) => r.code === "UXD");
    if (!uxd) throw new Error("UXD missing from result");
    expect(uxd.current_count).toBe(5);
    expect(uxd.remaining).toBe(uxd.capacity - 5);
    expect(uxd.is_full).toBe(false);
    // Tracks with no count default to 0
    const other = result.find((r) => r.code !== "UXD");
    expect(other?.current_count).toBe(0);
    expect(result).toHaveLength(TRACKS.length);
  });

  it("flags is_full when current >= capacity", async () => {
    const { withCapacity } = await import("./tracks");
    const uxd = TRACKS.find((t) => t.code === "UXD");
    if (!uxd) throw new Error("UXD missing from fixture catalogue");
    const result = withCapacity({ UXD: uxd.capacity });
    const row = result.find((r) => r.code === "UXD");
    expect(row?.is_full).toBe(true);
    expect(row?.remaining).toBe(0);
  });

  it("accepts a custom source list", async () => {
    const { withCapacity } = await import("./tracks");
    const subset = TRACKS.slice(0, 1);
    const result = withCapacity({}, subset);
    expect(result).toHaveLength(1);
    expect(result[0]?.current_count).toBe(0);
  });
});

describe("getTrackCount", () => {
  it("returns the count for an uppercased code", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: null, error: null, count: 7 } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { getTrackCount } = await import("./tracks");
    expect(await getTrackCount("uxd")).toBe(7);
    const eq = supabase._calls.at(-1)?.filters.find((f) => f.method === "eq");
    expect(eq?.args).toEqual(["track_code", "UXD"]);
  });

  it("returns 0 when count is null", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: null, error: null, count: null } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { getTrackCount } = await import("./tracks");
    expect(await getTrackCount("UXD")).toBe(0);
  });
});
