import { describe, expect, it } from "vitest";
import { formatReference, isValidReference, parseReference } from "./generate";

describe("isValidReference", () => {
  it("accepts SKU-{2-4 letters}-{1-5 digits}", () => {
    expect(isValidReference("SKU-UXD-001")).toBe(true);
    expect(isValidReference("SKU-CWD-99")).toBe(true);
    expect(isValidReference("SKU-ADR-12345")).toBe(true);
    expect(isValidReference("SKU-AB-1")).toBe(true);
  });

  it("normalises case before checking", () => {
    expect(isValidReference("sku-uxd-001")).toBe(true);
    expect(isValidReference("  SKU-UXD-001  ")).toBe(true);
  });

  it("rejects malformed inputs", () => {
    expect(isValidReference("UXD-001")).toBe(false);
    expect(isValidReference("SKU--001")).toBe(false);
    expect(isValidReference("SKU-UXDXY-001")).toBe(false); // 5 letters exceeds the 2-4 cap
    expect(isValidReference("SKU-UXD-")).toBe(false);
    expect(isValidReference("SKU-UXD-ABC")).toBe(false);
    expect(isValidReference("")).toBe(false);
  });
});

describe("parseReference", () => {
  it("returns track code + sequence on a valid input", () => {
    expect(parseReference("SKU-UXD-001")).toEqual({
      trackCode: "UXD",
      sequence: 1,
    });
    expect(parseReference("sku-cwd-42")).toEqual({
      trackCode: "CWD",
      sequence: 42,
    });
  });

  it("returns null for invalid input", () => {
    expect(parseReference("not-a-ref")).toBeNull();
    expect(parseReference("SKU-UXD")).toBeNull();
  });
});

describe("formatReference", () => {
  it("zero-pads sequence to at least 3 digits", () => {
    expect(formatReference("UXD", 1)).toBe("SKU-UXD-001");
    expect(formatReference("UXD", 99)).toBe("SKU-UXD-099");
    expect(formatReference("UXD", 100)).toBe("SKU-UXD-100");
    expect(formatReference("UXD", 9999)).toBe("SKU-UXD-9999");
  });

  it("uppercases the track code", () => {
    expect(formatReference("uxd", 1)).toBe("SKU-UXD-001");
  });

  it("round-trips with parseReference", () => {
    for (const seq of [1, 7, 42, 100, 9999]) {
      const ref = formatReference("UXD", seq);
      const parsed = parseReference(ref);
      expect(parsed).not.toBeNull();
      expect(parsed?.trackCode).toBe("UXD");
      expect(parsed?.sequence).toBe(seq);
    }
  });
});
