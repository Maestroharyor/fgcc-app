/**
 * Reference code helpers.
 *
 * The actual SKU-{CODE}-{NNN} is generated server-side by the Supabase trigger
 * `generate_reference_number()`. These helpers are for parsing + preview only.
 */

const REF_REGEX = /^SKU-([A-Z]{2,4})-(\d{1,5})$/;

export function isValidReference(value: string): boolean {
  return REF_REGEX.test(value.trim().toUpperCase());
}

export function parseReference(
  value: string,
): { trackCode: string; sequence: number } | null {
  const match = value.trim().toUpperCase().match(REF_REGEX);
  if (!match) return null;
  return { trackCode: match[1], sequence: Number(match[2]) };
}

export function formatReference(trackCode: string, sequence: number): string {
  return `SKU-${trackCode.toUpperCase()}-${sequence.toString().padStart(3, "0")}`;
}
