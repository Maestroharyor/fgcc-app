import { describe, expect, it } from "vitest";
import {
  BroadcastSmsSchema,
  CheckinSchema,
  EnquirySchema,
  FeedbackSchema,
  LoginSchema,
  OthersRegistrantSchema,
  RegisterOthersSchema,
  RegistrationSchema,
  SubmitterSchema,
} from "./schemas";

const validRegistration = {
  full_name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+2348012345678",
  gender: "female",
  age_group: "26_35",
  track_code: "uxd",
  how_heard: "whatsapp",
  church: "Cement HQ",
};

describe("RegistrationSchema", () => {
  it("accepts a valid registration and uppercases the track code", () => {
    const parsed = RegistrationSchema.parse(validRegistration);
    expect(parsed.track_code).toBe("UXD");
    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.church).toBe("Cement HQ");
  });

  it("requires church (form picks from district list or 'Other' free text)", () => {
    expect(() =>
      RegistrationSchema.parse({ ...validRegistration, church: "" }),
    ).toThrow();
    expect(() =>
      RegistrationSchema.parse({ ...validRegistration, church: undefined }),
    ).toThrow();
  });

  it("accepts any non-trivial church string (catalogue or 'Other' free text)", () => {
    const fromCatalogue = RegistrationSchema.parse({
      ...validRegistration,
      church: "Mangoro",
    });
    expect(fromCatalogue.church).toBe("Mangoro");
    const fromOther = RegistrationSchema.parse({
      ...validRegistration,
      church: "RCCG Lagos Province 12",
    });
    expect(fromOther.church).toBe("RCCG Lagos Province 12");
  });

  it("rejects a bad email address", () => {
    expect(() =>
      RegistrationSchema.parse({ ...validRegistration, email: "not-an-email" }),
    ).toThrow();
  });

  it("rejects a too-short name", () => {
    expect(() =>
      RegistrationSchema.parse({ ...validRegistration, full_name: "A" }),
    ).toThrow();
  });

  it("rejects an invalid gender value", () => {
    expect(() =>
      RegistrationSchema.parse({ ...validRegistration, gender: "alien" }),
    ).toThrow();
  });

  it("rejects an invalid phone format", () => {
    expect(() =>
      RegistrationSchema.parse({ ...validRegistration, phone: "abc" }),
    ).toThrow();
  });

  it("rejects an out-of-range age group", () => {
    expect(() =>
      RegistrationSchema.parse({ ...validRegistration, age_group: "older" }),
    ).toThrow();
  });
});

describe("SubmitterSchema", () => {
  it("accepts a complete submitter", () => {
    const parsed = SubmitterSchema.parse({
      submitter_name: "Sarah Smith",
      submitter_email: "sarah@example.com",
      submitter_phone: "08012345678",
      relationship: "pastor",
      church: "Cement HQ",
    });
    expect(parsed.relationship).toBe("pastor");
  });

  it("rejects an invalid relationship", () => {
    expect(() =>
      SubmitterSchema.parse({
        submitter_name: "Sarah Smith",
        submitter_email: "sarah@example.com",
        submitter_phone: "08012345678",
        relationship: "neighbour",
        church: "Cement HQ",
      }),
    ).toThrow();
  });
});

describe("OthersRegistrantSchema", () => {
  const baseRegistrant = {
    full_name: "Femi Smith",
    phone: "08012345678",
    gender: "male" as const,
    age_group: "18_25" as const,
    track_code: "CWD",
    church: "Cement",
  };

  it("makes email optional and lowercases it when provided", () => {
    const parsed = OthersRegistrantSchema.parse({
      ...baseRegistrant,
      track_code: "cwd",
      email: "Femi@EXAMPLE.COM",
    });
    expect(parsed.email).toBe("femi@example.com");
    expect(parsed.track_code).toBe("CWD");
  });

  it("accepts an empty email and normalises it to undefined", () => {
    const parsed = OthersRegistrantSchema.parse({
      ...baseRegistrant,
      email: "",
    });
    expect(parsed.email).toBeUndefined();
  });

  it("requires church for each registrant", () => {
    expect(() =>
      OthersRegistrantSchema.parse({ ...baseRegistrant, church: "" }),
    ).toThrow();
  });
});

describe("RegisterOthersSchema", () => {
  const submitter = {
    submitter_name: "Pastor Joe",
    submitter_email: "joe@example.com",
    submitter_phone: "08012345678",
    relationship: "pastor" as const,
    church: "Cement HQ",
  };

  it("accepts 1-20 registrants under one submitter", () => {
    const parsed = RegisterOthersSchema.parse({
      submitter,
      registrants: Array.from({ length: 3 }, () => ({
        full_name: "Member One",
        phone: "08012345678",
        gender: "female" as const,
        age_group: "18_25" as const,
        track_code: "UXD",
        church: "Cement",
      })),
    });
    expect(parsed.registrants).toHaveLength(3);
  });

  it("rejects more than 20 registrants", () => {
    expect(() =>
      RegisterOthersSchema.parse({
        submitter,
        registrants: Array.from({ length: 21 }, () => ({
          full_name: "Member",
          phone: "08012345678",
          gender: "female",
          age_group: "18_25",
          track_code: "UXD",
          church: "Cement",
        })),
      }),
    ).toThrow();
  });

  it("rejects zero registrants", () => {
    expect(() =>
      RegisterOthersSchema.parse({ submitter, registrants: [] }),
    ).toThrow();
  });
});

describe("EnquirySchema", () => {
  const validEnquiry = {
    full_name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "08012345678",
    topic: "registration" as const,
    subject: "Can't find my reference number",
    message: "I registered last week and the confirmation email never arrived.",
    consent: true as const,
  };

  it("accepts a complete enquiry", () => {
    const parsed = EnquirySchema.parse(validEnquiry);
    expect(parsed.topic).toBe("registration");
    expect(parsed.phone).toBe("+2348012345678");
  });

  it("treats empty phone as undefined", () => {
    const parsed = EnquirySchema.parse({ ...validEnquiry, phone: "" });
    expect(parsed.phone).toBeUndefined();
  });

  it("rejects a missing consent box", () => {
    expect(() =>
      EnquirySchema.parse({ ...validEnquiry, consent: false }),
    ).toThrow();
  });

  it("rejects too-short messages", () => {
    expect(() =>
      EnquirySchema.parse({ ...validEnquiry, message: "too short" }),
    ).toThrow();
  });

  it("rejects unknown topics", () => {
    expect(() =>
      EnquirySchema.parse({ ...validEnquiry, topic: "weather" }),
    ).toThrow();
  });
});

describe("FeedbackSchema", () => {
  const base = {
    reference_number: "SKU-UXD-001",
    overall_rating: 5,
    track_rating: 4,
    facilitator_rating: 5,
  };

  it("accepts a minimal valid feedback payload", () => {
    expect(() => FeedbackSchema.parse(base)).not.toThrow();
  });

  it("requires ratings as numbers (no auto-coercion)", () => {
    // The form sends numbers directly; coercion was dropped so input/output
    // shapes match and zodResolver can type RHF cleanly.
    expect(() =>
      FeedbackSchema.parse({ ...base, overall_rating: "5" }),
    ).toThrow();
  });

  it("rejects rating outside 1-5", () => {
    expect(() =>
      FeedbackSchema.parse({ ...base, overall_rating: 0 }),
    ).toThrow();
    expect(() =>
      FeedbackSchema.parse({ ...base, overall_rating: 6 }),
    ).toThrow();
  });

  it("rejects malformed reference numbers", () => {
    expect(() =>
      FeedbackSchema.parse({ ...base, reference_number: "abc" }),
    ).toThrow();
  });
});

describe("LoginSchema", () => {
  it("requires a real email and 6+ char password", () => {
    expect(() =>
      LoginSchema.parse({ email: "a@b.com", password: "longenough" }),
    ).not.toThrow();
    expect(() =>
      LoginSchema.parse({ email: "nope", password: "longenough" }),
    ).toThrow();
    expect(() =>
      LoginSchema.parse({ email: "a@b.com", password: "x" }),
    ).toThrow();
  });
});

describe("CheckinSchema", () => {
  it("uppercases the reference and validates the format", () => {
    expect(CheckinSchema.parse({ reference_number: "sku-uxd-007" })).toEqual({
      reference_number: "SKU-UXD-007",
    });
    expect(() => CheckinSchema.parse({ reference_number: "bad" })).toThrow();
  });
});

describe("BroadcastSmsSchema", () => {
  it("requires a valid audience and ≤160-char message", () => {
    expect(() =>
      BroadcastSmsSchema.parse({ audience: "all", message: "Hi" }),
    ).not.toThrow();
    expect(() =>
      BroadcastSmsSchema.parse({ audience: "all", message: "" }),
    ).toThrow();
    expect(() =>
      BroadcastSmsSchema.parse({
        audience: "all",
        message: "a".repeat(161),
      }),
    ).toThrow();
    expect(() =>
      BroadcastSmsSchema.parse({ audience: "noisy", message: "ok" }),
    ).toThrow();
  });
});
