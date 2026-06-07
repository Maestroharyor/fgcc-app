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
  // Closed tracks always read as full, so these tests pick an open one.
  const openTrack = TRACKS.find((t) => !t.closed);
  if (!openTrack) throw new Error("No open track in the catalogue");

  it("merges static track metadata with counts and computes remaining/is_full", async () => {
    const { withCapacity } = await import("./tracks");
    const result = withCapacity({ [openTrack.code]: 5 });
    const row = result.find((r) => r.code === openTrack.code);
    if (!row) throw new Error(`${openTrack.code} missing from result`);
    expect(row.current_count).toBe(5);
    expect(row.remaining).toBe(row.capacity - 5);
    expect(row.is_full).toBe(false);
    // Tracks with no count default to 0
    const other = result.find((r) => r.code !== openTrack.code && !r.is_full);
    expect(other?.current_count).toBe(0);
    expect(result).toHaveLength(TRACKS.length);
  });

  it("flags is_full when current >= capacity", async () => {
    const { withCapacity } = await import("./tracks");
    const result = withCapacity({ [openTrack.code]: openTrack.capacity });
    const row = result.find((r) => r.code === openTrack.code);
    expect(row?.is_full).toBe(true);
    expect(row?.remaining).toBe(0);
  });

  it("treats a closed track as full even with zero registrations", async () => {
    const { withCapacity } = await import("./tracks");
    const result = withCapacity({}, [{ ...openTrack, closed: true }]);
    expect(result[0]?.is_full).toBe(true);
    expect(result[0]?.remaining).toBe(0);
    expect(result[0]?.current_count).toBe(0);
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
