import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";
import { RedirectError } from "../../../vitest.setup";

let supabase: SupabaseMock;

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => supabase),
}));

import { getCurrentRole, requireRole } from "./require-role";

beforeEach(() => {
  supabase = createSupabaseMock();
});

describe("requireRole", () => {
  it("redirects to /admin/login when there's no authenticated user", async () => {
    supabase = createSupabaseMock({ user: null });
    await expect(requireRole("admin")).rejects.toThrow(RedirectError);
    await expect(requireRole("admin")).rejects.toMatchObject({
      destination: "/admin/login",
    });
  });

  it("redirects to login?error=forbidden when user has no role row", async () => {
    supabase = createSupabaseMock({
      user: { id: "u1", email: "a@b.c" },
      from: { user_roles: { data: null, error: null } },
    });
    await expect(requireRole("admin")).rejects.toMatchObject({
      destination: "/admin/login?error=forbidden",
    });
  });

  it("rejects an admin trying to access a superadmin-only path", async () => {
    supabase = createSupabaseMock({
      user: { id: "u1", email: "a@b.c" },
      from: { user_roles: { data: { role: "admin" }, error: null } },
    });
    await expect(requireRole("superadmin")).rejects.toMatchObject({
      destination: "/admin/dashboard?error=forbidden",
    });
  });

  it("returns the authorized user when admin minimum is met", async () => {
    supabase = createSupabaseMock({
      user: { id: "u1", email: "a@b.c" },
      from: { user_roles: { data: { role: "admin" }, error: null } },
    });
    const result = await requireRole("admin");
    expect(result.userId).toBe("u1");
    expect(result.role).toBe("admin");
  });

  it("promotes superadmin → admin checks correctly", async () => {
    supabase = createSupabaseMock({
      user: { id: "u1", email: "boss@x.com" },
      from: { user_roles: { data: { role: "superadmin" }, error: null } },
    });
    const result = await requireRole("admin");
    expect(result.role).toBe("superadmin");
  });

  it("allows superadmin access to superadmin paths", async () => {
    supabase = createSupabaseMock({
      user: { id: "u1", email: "boss@x.com" },
      from: { user_roles: { data: { role: "superadmin" }, error: null } },
    });
    const result = await requireRole("superadmin");
    expect(result.role).toBe("superadmin");
  });
});

describe("getCurrentRole", () => {
  it("returns null when no user", async () => {
    supabase = createSupabaseMock({ user: null });
    const result = await getCurrentRole();
    expect(result).toBeNull();
  });

  it("returns null when user exists but has no role row", async () => {
    supabase = createSupabaseMock({
      user: { id: "u1", email: "a@b.c" },
      from: { user_roles: { data: null, error: null } },
    });
    expect(await getCurrentRole()).toBeNull();
  });

  it("returns the role payload when both present", async () => {
    supabase = createSupabaseMock({
      user: { id: "u1", email: "a@b.c" },
      from: { user_roles: { data: { role: "admin" }, error: null } },
    });
    expect(await getCurrentRole()).toEqual({
      userId: "u1",
      email: "a@b.c",
      role: "admin",
    });
  });
});
