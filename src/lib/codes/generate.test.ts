import { describe, expect, it } from "vitest";
import {
  ACTION_CODE_LENGTH,
  generateActionCode,
  hashActionCode,
} from "./generate";

describe("generateActionCode", () => {
  it("produces 6-char uppercase alphanumeric codes", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateActionCode()).toMatch(/^[A-Z0-9]{6}$/);
    }
  });

  it("matches the exported length constant", () => {
    expect(generateActionCode()).toHaveLength(ACTION_CODE_LENGTH);
  });
});

describe("hashActionCode", () => {
  it("is deterministic for the same code", () => {
    expect(hashActionCode("AB12CD")).toBe(hashActionCode("AB12CD"));
  });

  it("normalises case and whitespace before hashing", () => {
    expect(hashActionCode(" ab12cd ")).toBe(hashActionCode("AB12CD"));
  });

  it("produces different hashes for different codes", () => {
    expect(hashActionCode("AB12CD")).not.toBe(hashActionCode("AB12CE"));
  });

  it("returns sha256 hex", () => {
    expect(hashActionCode("AB12CD")).toMatch(/^[a-f0-9]{64}$/);
  });
});
