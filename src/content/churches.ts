/**
 * Static catalogue of Foursquare Cement District churches, grouped by zone.
 *
 * Used by the searchable ChurchSelect on registration / enquiry forms. Anyone
 * outside the district picks "Other" and types their church / organisation.
 */

export type ChurchZoneId = "cement" | "aseyori";

export interface ChurchZone {
  id: ChurchZoneId;
  label: string;
  churches: readonly string[];
}

export const CHURCH_ZONES: readonly ChurchZone[] = [
  {
    id: "cement",
    label: "Cement Zone",
    churches: ["Cement", "Mangoro", "Onilekere", "Akinogun", "Iloro", "Maya"],
  },
  {
    id: "aseyori",
    label: "Aseyori Zone",
    churches: [
      "Aseyori",
      "Gasline 1",
      "Gasline 2",
      "Obere",
      "Onihale",
      "Wonderful Estate",
    ],
  },
] as const;

/** Flat list of every listed church name across all zones. */
export const CHURCH_VALUES: readonly string[] = CHURCH_ZONES.flatMap(
  (z) => z.churches,
);

/** Sentinel value used inside the Autocomplete for the "Other" escape hatch. */
export const OTHER_CHURCH_VALUE = "__other__" as const;

/** Returns the zone label for a church name, or null if it's not in the catalogue. */
export function zoneOfChurch(name: string): string | null {
  for (const zone of CHURCH_ZONES) {
    if (zone.churches.includes(name)) return zone.label;
  }
  return null;
}

/** Whether a value matches one of the catalogued church names. */
export function isCataloguedChurch(value: string | undefined | null): boolean {
  if (!value) return false;
  return CHURCH_VALUES.includes(value);
}
