import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type SendResult = {
  data: { id: string } | null;
  error: { message: string } | null;
};

const { sendMock, isConfiguredMock, resendClientMock } = vi.hoisted(() => ({
  sendMock: vi.fn<(...args: unknown[]) => Promise<SendResult>>(async () => ({
    data: { id: "msg" },
    error: null,
  })),
  isConfiguredMock: vi.fn(() => true),
  resendClientMock: vi.fn(() => ({ emails: { send: sendMock } })),
}));

vi.mock("@/lib/email/client", () => ({
  resendClient: resendClientMock,
  isEmailConfigured: isConfiguredMock,
}));

vi.mock("@/lib/utils/env", () => ({
  env: {
    RESEND_FROM: "SkillUp <noreply@x.com>",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    ADMIN_NOTIFICATION_EMAILS: "admin@x.com",
  },
  adminNotificationEmails: ["admin@x.com"],
}));

import {
  sendAdminNotificationEmail,
  sendCertificateEmail,
  sendConfirmationEmail,
  sendEnquiryAckEmail,
  sendEnquiryNotificationEmail,
  sendFeedbackRequestEmail,
  sendRegistrationUpdatedEmail,
  sendReminder1DayEmail,
  sendReminder3DayEmail,
  sendSubmitterSummaryEmail,
  sendWaitlistConfirmEmail,
  sendWaitlistOfferEmail,
} from "./send";

beforeEach(() => {
  sendMock.mockClear();
  isConfiguredMock.mockReturnValue(true);
  sendMock.mockResolvedValue({ data: { id: "msg" }, error: null });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("send helpers - happy paths", () => {
  it("sendConfirmationEmail passes from/to/subject and a react element", async () => {
    const result = await sendConfirmationEmail("john@example.com", {
      firstName: "John",
      referenceNumber: "SKU-UXD-001",
      trackName: "UI/UX Design",
      facilitatorName: "Ayomide",
      whatsappUrl: "https://wa.me/x",
      siteUrl: "http://localhost:3000",
    });
    expect(result.ok).toBe(true);
    const call = sendMock.mock.calls[0]?.[0] as unknown as {
      from: string;
      to: string;
      subject: string;
      react: unknown;
    };
    expect(call.from).toBe("SkillUp <noreply@x.com>");
    expect(call.to).toBe("john@example.com");
    expect(call.subject).toContain("UI/UX Design");
    expect(call.react).toBeDefined();
  });

  it("sendEnquiryNotificationEmail routes to admin recipients with reply-to set to the enquirer", async () => {
    await sendEnquiryNotificationEmail({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+2348012345678",
      topicLabel: "Registration help",
      subject: "Help",
      message: "I cannot find my reference number anywhere.",
      submittedAtIso: "2026-05-14T10:00:00.000Z",
    });
    const call = sendMock.mock.calls[0]?.[0] as unknown as {
      to: string | string[];
      subject: string;
      replyTo: string;
    };
    expect(call.to).toEqual(["admin@x.com"]);
    expect(call.subject).toContain("Ada Lovelace");
    expect(call.replyTo).toBe("ada@example.com");
  });

  it("sendAdminNotificationEmail uses configured admin recipients", async () => {
    await sendAdminNotificationEmail({
      type: "self",
      registrants: [
        {
          fullName: "John",
          referenceNumber: "SKU-UXD-001",
          trackName: "UI/UX Design",
          email: "j@x.com",
          phone: "+234",
          church: null,
        },
      ],
      dashboardUrl: "http://x/admin/registrations",
    });
    const call = sendMock.mock.calls[0]?.[0] as unknown as {
      to: string | string[];
    };
    expect(call.to).toEqual(["admin@x.com"]);
  });

  it("sendCertificateEmail attaches the PDF buffer", async () => {
    const buf = Buffer.from("%PDF-test");
    await sendCertificateEmail(
      "x@y.com",
      { firstName: "X", trackName: "T" },
      buf,
    );
    const call = sendMock.mock.calls[0]?.[0] as unknown as {
      attachments: Array<{ filename: string; content: Buffer }>;
    };
    expect(call.attachments?.[0].filename).toMatch(/Certificate\.pdf$/);
    expect(call.attachments?.[0].content).toBe(buf);
  });

  it.each([
    [
      "submitter summary",
      () =>
        sendSubmitterSummaryEmail("s@x.com", {
          submitterName: "S",
          registrants: [],
        }),
    ],
    [
      "waitlist confirm",
      () =>
        sendWaitlistConfirmEmail("w@x.com", {
          firstName: "W",
          trackName: "T",
          position: 3,
          siteUrl: "http://x",
        }),
    ],
    [
      "waitlist offer",
      () =>
        sendWaitlistOfferEmail("w@x.com", {
          firstName: "W",
          trackName: "T",
          claimUrl: "http://x/claim",
          expiresAt: "in 24 hours",
        }),
    ],
    [
      "3-day reminder",
      () =>
        sendReminder3DayEmail("r@x.com", {
          firstName: "R",
          trackName: "T",
          facilitatorName: "F",
        }),
    ],
    [
      "1-day reminder",
      () =>
        sendReminder1DayEmail("r@x.com", {
          firstName: "R",
          trackName: "T",
        }),
    ],
    [
      "feedback request",
      () =>
        sendFeedbackRequestEmail("r@x.com", {
          firstName: "R",
          trackName: "T",
          feedbackUrl: "http://x/feedback",
        }),
    ],
    [
      "enquiry acknowledgement",
      () =>
        sendEnquiryAckEmail("ack@x.com", {
          firstName: "Ada",
          topicLabel: "Registration help",
          subject: "Can't find ref",
          message: "Long message body here please respond.",
          siteUrl: "http://x",
        }),
    ],
    [
      "registration updated",
      () =>
        sendRegistrationUpdatedEmail("u@x.com", {
          firstName: "U",
          referenceNumber: "SKU-UXD-001",
          trackName: "T",
          email: "u@x.com",
          phone: null,
          siteUrl: "http://x",
        }),
    ],
  ])("%s returns ok and calls Resend", async (_name, fn) => {
    const result = await fn();
    expect(result.ok).toBe(true);
    expect(sendMock).toHaveBeenCalledOnce();
  });
});

describe("send helpers - failure paths", () => {
  it("returns ok:false when Resend isn't configured", async () => {
    isConfiguredMock.mockReturnValueOnce(false);
    const result = await sendConfirmationEmail("x@y.com", {
      firstName: "x",
      referenceNumber: "SKU-UXD-001",
      trackName: "x",
      facilitatorName: null,
      whatsappUrl: "x",
      siteUrl: "x",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("resend-not-configured");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("propagates Resend errors as ok:false + message", async () => {
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { message: "rate limited" },
    });
    const result = await sendConfirmationEmail("x@y.com", {
      firstName: "x",
      referenceNumber: "SKU-UXD-001",
      trackName: "x",
      facilitatorName: null,
      whatsappUrl: "x",
      siteUrl: "x",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("rate limited");
  });

  it("catches thrown errors from Resend client", async () => {
    sendMock.mockRejectedValueOnce(new Error("network down"));
    const result = await sendConfirmationEmail("x@y.com", {
      firstName: "x",
      referenceNumber: "SKU-UXD-001",
      trackName: "x",
      facilitatorName: null,
      whatsappUrl: "x",
      siteUrl: "x",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("network down");
  });
});

describe("admin notification - empty recipients", () => {
  it("returns no-admin-emails error when env list is empty", async () => {
    vi.resetModules();
    vi.doMock("@/lib/email/client", () => ({
      resendClient: resendClientMock,
      isEmailConfigured: isConfiguredMock,
    }));
    vi.doMock("@/lib/utils/env", () => ({
      env: {
        RESEND_FROM: "x",
        NEXT_PUBLIC_SITE_URL: "x",
        ADMIN_NOTIFICATION_EMAILS: "",
      },
      adminNotificationEmails: [] as string[],
    }));
    const mod = await import("./send");
    const result = await mod.sendAdminNotificationEmail({
      type: "self",
      registrants: [],
      dashboardUrl: "x",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("no-admin-emails");
  });
});
