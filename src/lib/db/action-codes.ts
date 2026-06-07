import { generateActionCode, hashActionCode } from "@/lib/codes/generate";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Email confirmation codes for sensitive admin actions. Rows live in
 * `admin_action_codes`, which has RLS enabled with NO policies - only the
 * service-role client can touch it. Callers MUST gate with requireRole()
 * before calling these helpers.
 */

export type AdminAction = "track_change" | "delete_registration";

export const ACTION_CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

interface ActionCodeKey {
  registrationId: string;
  adminUserId: string;
  action: AdminAction;
}

export type CreateActionCodeResult =
  | { ok: true; code: string; expiresMinutes: number }
  | { ok: false; error: string };

/**
 * Issue a fresh single-use code bound to (registration, admin, action).
 * Any prior unconsumed code for the same triple is invalidated first, so
 * "Resend code" never leaves two live codes in play.
 */
export async function createActionCode({
  registrationId,
  adminUserId,
  action,
  payload = {},
}: ActionCodeKey & {
  payload?: Record<string, unknown>;
}): Promise<CreateActionCodeResult> {
  const supabase = createSupabaseAdminClient();

  await supabase
    .from("admin_action_codes")
    .delete()
    .eq("registration_id", registrationId)
    .eq("admin_user_id", adminUserId)
    .eq("action", action)
    .is("consumed_at", null);

  const code = generateActionCode();
  const { error } = await supabase.from("admin_action_codes").insert({
    registration_id: registrationId,
    admin_user_id: adminUserId,
    action,
    payload,
    code_hash: hashActionCode(code),
    expires_at: new Date(
      Date.now() + ACTION_CODE_TTL_MINUTES * 60_000,
    ).toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, code, expiresMinutes: ACTION_CODE_TTL_MINUTES };
}

export type VerifyActionCodeResult =
  | { ok: true; payload: Record<string, unknown> }
  | {
      ok: false;
      error:
        | "no-code"
        | "expired"
        | "too-many-attempts"
        | "invalid"
        | "already-used"
        | string;
    };

/**
 * Check a submitted code against the latest pending row and consume it on
 * match. Wrong guesses increment `attempts` (max 5); the consume UPDATE is
 * guarded by `consumed_at is null` so a double-submit can't use a code twice.
 */
export async function verifyAndConsumeActionCode({
  registrationId,
  adminUserId,
  action,
  code,
}: ActionCodeKey & { code: string }): Promise<VerifyActionCodeResult> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("admin_action_codes")
    .select("id, code_hash, attempts, expires_at, payload")
    .eq("registration_id", registrationId)
    .eq("admin_user_id", adminUserId)
    .eq("action", action)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "no-code" };

  const row = data as {
    id: string;
    code_hash: string;
    attempts: number;
    expires_at: string;
    payload: Record<string, unknown> | null;
  };

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "expired" };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "too-many-attempts" };
  }
  if (hashActionCode(code) !== row.code_hash) {
    await supabase
      .from("admin_action_codes")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);
    return { ok: false, error: "invalid" };
  }

  const { data: consumed, error: consumeError } = await supabase
    .from("admin_action_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("consumed_at", null)
    .select("id");
  if (consumeError) return { ok: false, error: consumeError.message };
  if (!consumed || (Array.isArray(consumed) && consumed.length === 0)) {
    return { ok: false, error: "already-used" };
  }

  return { ok: true, payload: row.payload ?? {} };
}
