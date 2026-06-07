import { createHash, randomInt } from "node:crypto";

/** Alphabet for confirmation codes. Uppercase alphanumeric, no exclusions. */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export const ACTION_CODE_LENGTH = 6;

/** Cryptographically random 6-char uppercase alphanumeric code. */
export function generateActionCode(): string {
  let code = "";
  for (let i = 0; i < ACTION_CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

/**
 * sha256 hex of a (normalised) code. Only the hash is stored, so a leaked
 * `admin_action_codes` row can't be replayed within its validity window.
 */
export function hashActionCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}
