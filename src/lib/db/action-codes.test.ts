import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashActionCode } from "@/lib/codes/generate";
import {
  type ChainCall,
  createSupabaseMock,
  type SupabaseMock,
} from "@/test/mocks/supabase";

let supabase: SupabaseMock;

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient }));

import { createActionCode, verifyAndConsumeActionCode } from "./action-codes";

const KEY = {
  registrationId: "reg-1",
  adminUserId: "admin-1",
  action: "track_change" as const,
};

function futureIso(minutes = 5) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function pendingRow(code: string, overrides: Record<string, unknown> = {}) {
  return {
    id: "code-row-1",
    code_hash: hashActionCode(code),
    attempts: 0,
    expires_at: futureIso(),
    payload: { new_track_code: "PHO" },
    ...overrides,
  };
}

beforeEach(() => {
  supabase = createSupabaseMock();
  createSupabaseAdminClient.mockImplementation(() => supabase);
});

describe("createActionCode", () => {
  it("invalidates prior pending codes then inserts a fresh one", async () => {
    supabase = createSupabaseMock({
      from: { admin_action_codes: { data: null, error: null } },
    });
    createSupabaseAdminClient.mockImplementation(() => supabase);

    const result = await createActionCode({ ...KEY });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(result.expiresMinutes).toBe(10);

    const [del, ins] = supabase._calls;
    expect(del.operation).toBe("delete");
    expect(del.filters).toContainEqual({
      method: "is",
      args: ["consumed_at", null],
    });
    expect(ins.operation).toBe("insert");
    const payload = ins.payload as Record<string, unknown>;
    expect(payload.code_hash).toBe(hashActionCode(result.code));
    expect(payload.action).toBe("track_change");
    expect(new Date(payload.expires_at as string).getTime()).toBeGreaterThan(
      Date.now(),
    );
  });

  it("surfaces an insert error", async () => {
    supabase = createSupabaseMock({
      from: {
        admin_action_codes: (chain: ChainCall) =>
          chain.operation === "insert"
            ? { data: null, error: { message: "boom" } }
            : { data: null, error: null },
      },
    });
    createSupabaseAdminClient.mockImplementation(() => supabase);

    const result = await createActionCode({ ...KEY });
    expect(result).toMatchObject({ ok: false, error: "boom" });
  });
});

describe("verifyAndConsumeActionCode", () => {
  it("returns no-code when nothing is pending", async () => {
    supabase = createSupabaseMock({
      from: { admin_action_codes: { data: null, error: null } },
    });
    createSupabaseAdminClient.mockImplementation(() => supabase);

    const result = await verifyAndConsumeActionCode({ ...KEY, code: "AB12CD" });
    expect(result).toMatchObject({ ok: false, error: "no-code" });
  });

  // `.select("id")` after `.update()` overwrites `operation` in the mock, so
  // update calls are located by their recorded "update" filter instead.
  const isUpdate = (chain: ChainCall) =>
    chain.filters.some((f) => f.method === "update");

  it("consumes a matching code and returns its payload", async () => {
    supabase = createSupabaseMock({
      from: {
        admin_action_codes: (chain: ChainCall) =>
          isUpdate(chain)
            ? { data: [{ id: "code-row-1" }], error: null }
            : { data: pendingRow("AB12CD"), error: null },
      },
    });
    createSupabaseAdminClient.mockImplementation(() => supabase);

    const result = await verifyAndConsumeActionCode({ ...KEY, code: "ab12cd" });
    expect(result).toMatchObject({
      ok: true,
      payload: { new_track_code: "PHO" },
    });

    const consume = supabase._calls.find((c) => isUpdate(c as ChainCall));
    expect(consume?.filters).toContainEqual({
      method: "is",
      args: ["consumed_at", null],
    });
    expect(
      (consume?.payload as Record<string, unknown>).consumed_at,
    ).toBeTruthy();
  });

  it("increments attempts on a wrong code", async () => {
    supabase = createSupabaseMock({
      from: {
        admin_action_codes: (chain: ChainCall) =>
          chain.operation === "update"
            ? { data: null, error: null }
            : { data: pendingRow("AB12CD", { attempts: 2 }), error: null },
      },
    });
    createSupabaseAdminClient.mockImplementation(() => supabase);

    const result = await verifyAndConsumeActionCode({ ...KEY, code: "WRONG1" });
    expect(result).toMatchObject({ ok: false, error: "invalid" });

    const bump = supabase._calls.find((c) => c.operation === "update");
    expect(bump?.payload).toMatchObject({ attempts: 3 });
  });

  it("rejects an expired code", async () => {
    supabase = createSupabaseMock({
      from: {
        admin_action_codes: {
          data: pendingRow("AB12CD", {
            expires_at: new Date(Date.now() - 60_000).toISOString(),
          }),
          error: null,
        },
      },
    });
    createSupabaseAdminClient.mockImplementation(() => supabase);

    const result = await verifyAndConsumeActionCode({ ...KEY, code: "AB12CD" });
    expect(result).toMatchObject({ ok: false, error: "expired" });
  });

  it("locks out after 5 attempts", async () => {
    supabase = createSupabaseMock({
      from: {
        admin_action_codes: {
          data: pendingRow("AB12CD", { attempts: 5 }),
          error: null,
        },
      },
    });
    createSupabaseAdminClient.mockImplementation(() => supabase);

    const result = await verifyAndConsumeActionCode({ ...KEY, code: "AB12CD" });
    expect(result).toMatchObject({ ok: false, error: "too-many-attempts" });
  });

  it("treats a lost consume race as already-used", async () => {
    supabase = createSupabaseMock({
      from: {
        admin_action_codes: (chain: ChainCall) =>
          isUpdate(chain)
            ? { data: [], error: null } // guard matched 0 rows
            : { data: pendingRow("AB12CD"), error: null },
      },
    });
    createSupabaseAdminClient.mockImplementation(() => supabase);

    const result = await verifyAndConsumeActionCode({ ...KEY, code: "AB12CD" });
    expect(result).toMatchObject({ ok: false, error: "already-used" });
  });
});
