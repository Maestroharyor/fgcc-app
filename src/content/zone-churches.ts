/**
 * Foursquare zone churches — used in the Register-for-Others form's
 * "Church or organisation" dropdown. Static so it's PR-reviewable; the
 * Register-for-Others flow also accepts free-text "Other" entries.
 */

export interface ZoneChurch {
  name: string;
  area: string;
}

export const ZONE_CHURCHES: ZoneChurch[] = [
  { name: "Cement Missionary HQ", area: "Cement, Lagos" },
  { name: "Foursquare Mafoluku", area: "Mafoluku, Lagos" },
  { name: "Foursquare Oshodi", area: "Oshodi, Lagos" },
  { name: "Foursquare Ilasamaja", area: "Ilasamaja, Lagos" },
  { name: "Foursquare Isolo", area: "Isolo, Lagos" },
  { name: "Foursquare Surulere", area: "Surulere, Lagos" },
  { name: "Foursquare Yaba", area: "Yaba, Lagos" },
  { name: "Foursquare Mushin", area: "Mushin, Lagos" },
];
