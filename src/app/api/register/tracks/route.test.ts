import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRACKS } from "@/content/tracks";
import type { TrackWithCapacity } from "@/lib/db/types";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

let supabase: SupabaseMock;

const { createSupabaseServerClient } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

import { GET } from "./route";

beforeEach(() => {
  supabase = createSupabaseMock();
  createSupabaseServerClient.mockImplementation(async () => supabase);
});

describe("GET /api/register/tracks", () => {
  it("returns the full catalogue with live counts merged in", async () => {
    supabase = createSupabaseMock({
      from: {
        v_track_counts: {
          data: [
            { track_code: "UXD", current_count: 5 },
            { track_code: "CWD", current_count: 17 },
          ],
          error: null,
        },
      },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as TrackWithCapacity[];
    expect(body).toHaveLength(TRACKS.length);

    const uxd = body.find((r) => r.code === "UXD");
    expect(uxd?.current_count).toBe(5);
    expect(uxd?.remaining).toBe((uxd?.capacity ?? 0) - 5);
    expect(uxd?.is_full).toBe(false);

    const cwd = body.find((r) => r.code === "CWD");
    expect(cwd?.current_count).toBe(17);
  });

  it("falls back to zero counts when the DB query errors", async () => {
    supabase = createSupabaseMock({
      from: {
        v_track_counts: { data: null, error: { message: "boom" } },
      },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as TrackWithCapacity[];
    expect(body).toHaveLength(TRACKS.length);
    expect(body.every((r) => r.current_count === 0)).toBe(true);
    expect(body.every((r) => r.remaining === r.capacity)).toBe(true);
  });

  it("emits the SWR cache header so bursts share one query per 10s", async () => {
    const res = await GET();
    expect(res.headers.get("Cache-Control")).toBe(
      "public, s-maxage=10, stale-while-revalidate=30",
    );
  });
});
