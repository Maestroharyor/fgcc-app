import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Permanently delete a registration. Superadmin only; RLS
 * (`registrations_superadmin_del`) is the second gate behind requireRole.
 * The UI confirms via modal before calling this.
 */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  await requireRole("superadmin");
  const { id } = await params;

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
