import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { submitFeedbackAction } = vi.hoisted(() => ({
  submitFeedbackAction: vi.fn(),
}));

vi.mock("@/app/(marketing)/skillup/feedback/actions", () => ({
  submitFeedbackAction,
}));

import { POST } from "./route";

beforeEach(() => {
  submitFeedbackAction.mockReset();
});

function makePost(body: unknown) {
  return new NextRequest("http://localhost:3000/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/feedback", () => {
  it("returns 200 with action payload on success", async () => {
    submitFeedbackAction.mockResolvedValue({ ok: true });
    const res = await POST(makePost({ reference_number: "SKU-UXD-001" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it("returns 400 with action message on failure", async () => {
    submitFeedbackAction.mockResolvedValue({
      ok: false,
      message: "Reference not found.",
    });
    const res = await POST(makePost({ reference_number: "missing" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("Reference not found");
  });

  it("forwards an empty JSON body to the action", async () => {
    submitFeedbackAction.mockResolvedValue({ ok: false, message: "bad" });
    await POST(
      new NextRequest("http://localhost:3000/api/feedback", { method: "POST" }),
    );
    expect(submitFeedbackAction).toHaveBeenCalledWith({});
  });
});
