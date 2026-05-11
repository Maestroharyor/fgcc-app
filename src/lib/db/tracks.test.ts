import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fixtureCapacityRow,
  fixtureFullCapacityRow,
  fixtureTrack,
} from "@/test/fixtures/tracks";
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

describe("listTracks", () => {
  it("returns active tracks from supabase", async () => {
    supabase = createSupabaseMock({
      from: { tracks: { data: [fixtureTrack], error: null } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { listTracks } = await import("./tracks");
    const result = await listTracks();
    expect(result).toEqual([fixtureTrack]);
  });

  it("returns [] on error", async () => {
    supabase = createSupabaseMock({
      from: { tracks: { data: null, error: { message: "boom" } } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { listTracks } = await import("./tracks");
    expect(await listTracks()).toEqual([]);
  });
});

describe("listTrackCapacity", () => {
  it("returns capacity rows", async () => {
    supabase = createSupabaseMock({
      from: {
        v_track_capacity: {
          data: [fixtureCapacityRow, fixtureFullCapacityRow],
          error: null,
        },
      },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { listTrackCapacity } = await import("./tracks");
    const result = await listTrackCapacity();
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.code === "CWD")?.is_full).toBe(true);
  });

  it("returns [] on error", async () => {
    supabase = createSupabaseMock({
      from: { v_track_capacity: { data: null, error: { message: "boom" } } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { listTrackCapacity } = await import("./tracks");
    expect(await listTrackCapacity()).toEqual([]);
  });
});

describe("getTrackByCode", () => {
  it("returns a track when found (uppercases code)", async () => {
    supabase = createSupabaseMock({
      from: { tracks: { data: fixtureTrack, error: null } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { getTrackByCode } = await import("./tracks");
    const result = await getTrackByCode("uxd");
    expect(result?.code).toBe("UXD");
    // Verify the query used the uppercased code
    const call = supabase._calls.at(-1);
    const eqFilter = call?.filters.find((f) => f.method === "eq");
    expect(eqFilter?.args).toEqual(["code", "UXD"]);
  });

  it("returns null when not found", async () => {
    supabase = createSupabaseMock({
      from: { tracks: { data: null, error: null } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { getTrackByCode } = await import("./tracks");
    expect(await getTrackByCode("xxx")).toBeNull();
  });
});

describe("getTrackCapacityByCode", () => {
  it("returns capacity row when found", async () => {
    supabase = createSupabaseMock({
      from: { v_track_capacity: { data: fixtureCapacityRow, error: null } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { getTrackCapacityByCode } = await import("./tracks");
    const result = await getTrackCapacityByCode("UXD");
    expect(result?.code).toBe("UXD");
  });

  it("returns null when missing", async () => {
    supabase = createSupabaseMock({
      from: { v_track_capacity: { data: null, error: null } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { getTrackCapacityByCode } = await import("./tracks");
    expect(await getTrackCapacityByCode("ZZZ")).toBeNull();
  });
});
