import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import {
  createActionCode,
  verifyAndConsumeActionCode,
} from "@/lib/db/action-codes";
import { sendAdminActionCodeEmail } from "@/lib/email/send";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DeleteRegistrationConfirmSchema } from "@/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Step 1: email a confirmation code to the logged-in superadmin. The actual
 * delete only happens in DELETE once the code is verified.
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  const session = await requireRole("superadmin");
  const { id } = await params;

  if (!session.email) {
    return NextResponse.json(
      { ok: false, error: "admin-no-email" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("registrations")
    .select("id, full_name, reference_number")
    .eq("id", id)
    .maybeSingle();
  const registration = data as {
    id: string;
    full_name: string;
    reference_number: string;
  } | null;
  if (!registration) {
    return NextResponse.json(
      { ok: false, error: "not-found" },
      { status: 404 },
    );
  }

  const created = await createActionCode({
    registrationId: registration.id,
    adminUserId: session.userId,
    action: "delete_registration",
  });
  if (!created.ok) {
    return NextResponse.json(
      { ok: false, error: "code-create-failed" },
      { status: 500 },
    );
  }

  const emailResult = await sendAdminActionCodeEmail(session.email, {
    code: created.code,
    actionLabel: "Delete registration",
    registrantName: registration.full_name,
    detail: registration.reference_number,
    expiresMinutes: created.expiresMinutes,
  });
  if (!emailResult.ok) {
    return NextResponse.json(
      { ok: false, error: emailResult.error ?? "email-failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

/**
 * Step 2: verify the emailed code and permanently delete the registration.
 * RLS (`registrations_superadmin_del`) is the second gate behind requireRole.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireRole("superadmin");
  const { id } = await params;

  const parsed = DeleteRegistrationConfirmSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid code" },
      { status: 400 },
    );
  }

  const verified = await verifyAndConsumeActionCode({
    registrationId: id,
    adminUserId: session.userId,
    action: "delete_registration",
    code: parsed.data.code,
  });
  if (!verified.ok) {
    return NextResponse.json(
      { ok: false, error: verified.error },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("registrations").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { ok: false, error: "delete-failed" },
      { status: 500 },
    );
  }

  revalidatePath("/admin/registrations");
  revalidatePath("/admin/dashboard");

  return NextResponse.json({ ok: true });
}
