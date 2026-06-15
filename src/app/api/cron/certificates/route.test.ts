import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  runDueCertificates: vi.fn(),
}));

vi.mock("@/lib/certificates/run", () => ({
  runDueCertificates: hoisted.runDueCertificates,
}));

vi.mock("@/lib/utils/env", () => ({
  env: { CRON_SECRET: "test-cron-secret" },
}));

import { GET } from "./route";

function makeReq(withAuth: boolean) {
  return new NextRequest("http://localhost:3000/api/cron/certificates", {
    headers: withAuth ? { authorization: "Bearer test-cron-secret" } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.runDueCertificates.mockResolvedValue({
    ok: true,
    due: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  });
});

describe("GET /api/cron/certificates", () => {
  it("returns 401 without the bearer token", async () => {
    const res = await GET(makeReq(false));
    expect(res.status).toBe(401);
    expect(hoisted.runDueCertificates).not.toHaveBeenCalled();
  });

  it("runs the due batch when authorised", async () => {
    hoisted.runDueCertificates.mockResolvedValue({
      ok: true,
      due: 3,
      sent: 3,
      failed: 0,
      skipped: 0,
    });
    const res = await GET(makeReq(true));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.sent).toBe(3);
    expect(hoisted.runDueCertificates).toHaveBeenCalledOnce();
  });
});
