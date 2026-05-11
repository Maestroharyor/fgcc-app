import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedirectError } from "../../../../../../vitest.setup";

const { requireRole } = vi.hoisted(() => ({
  requireRole: vi.fn(),
}));

vi.mock("@/lib/auth/require-role", () => ({ requireRole }));

import { POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/certificates/generate", () => {
  it("rejects non-superadmin callers", async () => {
    requireRole.mockImplementation(() => {
      throw new RedirectError("/admin/dashboard?error=forbidden");
    });
    await expect(POST()).rejects.toThrow(RedirectError);
  });

  it("returns ok:true when authorized", async () => {
    requireRole.mockResolvedValue({ role: "superadmin", userId: "u1" });
    const res = await POST();
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
