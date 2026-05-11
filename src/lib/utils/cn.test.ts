import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy classes with spaces", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters falsy entries", () => {
    expect(cn("a", false, null, undefined, "b", "")).toBe("a b");
  });

  it("supports conditional object form", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });

  it("flattens arrays", () => {
    expect(cn(["one", "two"], "three")).toBe("one two three");
  });
});
