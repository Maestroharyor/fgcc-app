import { describe, expect, it } from "vitest";
import {
  CHURCH_VALUES,
  CHURCH_ZONES,
  isCataloguedChurch,
  OTHER_CHURCH_VALUE,
  zoneOfChurch,
} from "./churches";

describe("CHURCH_ZONES catalogue", () => {
  it("contains both zones", () => {
    const ids = CHURCH_ZONES.map((z) => z.id);
    expect(ids).toEqual(["cement", "aseyori"]);
  });

  it("never duplicates a church name across zones", () => {
    const all = CHURCH_VALUES;
    expect(new Set(all).size).toBe(all.length);
  });

  it("never collides with the 'Other' sentinel", () => {
    expect(CHURCH_VALUES).not.toContain(OTHER_CHURCH_VALUE);
  });

  it("populates every zone with at least one church", () => {
    for (const zone of CHURCH_ZONES) {
      expect(zone.churches.length).toBeGreaterThan(0);
    }
  });
});

describe("zoneOfChurch", () => {
  it("returns the zone label for a catalogued church", () => {
    expect(zoneOfChurch("Cement")).toBe("Cement Zone");
    expect(zoneOfChurch("Aseyori")).toBe("Aseyori Zone");
    expect(zoneOfChurch("Wonderful Estate")).toBe("Aseyori Zone");
  });

  it("returns null for an unknown church", () => {
    expect(zoneOfChurch("Some Random Church")).toBeNull();
  });
});

describe("isCataloguedChurch", () => {
  it("recognises listed churches", () => {
    expect(isCataloguedChurch("Mangoro")).toBe(true);
  });

  it("rejects unknown names, empty, and nullish values", () => {
    expect(isCataloguedChurch("Other Place")).toBe(false);
    expect(isCataloguedChurch("")).toBe(false);
    expect(isCataloguedChurch(undefined)).toBe(false);
    expect(isCataloguedChurch(null)).toBe(false);
  });
});
