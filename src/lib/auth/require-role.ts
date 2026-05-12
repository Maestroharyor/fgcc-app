import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Role = "admin" | "superadmin";

export interface AuthorizedUser {
  userId: string;
  email: string | null;
  role: Role;
}

/**
 * Server-side role gate. Call at the top of every protected RSC, Route
 * Handler, and Server Action. Returns the authorized user or redirects.
 *
 * Proxy is the first line of defense; this is the second. UI hiding is
 * UX only - every mutation MUST call this too.
 */
export async function requireRole(minRole: Role): Promise<AuthorizedUser> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: roleRow, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !roleRow) {
    redirect("/admin/login?error=forbidden");
  }

  const role = roleRow.role as Role;
  if (minRole === "superadmin" && role !== "superadmin") {
    redirect("/admin/dashboard?error=forbidden");
  }

  return { userId: user.id, email: user.email ?? null, role };
}

export async function getCurrentRole(): Promise<AuthorizedUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!roleRow) return null;
  return {
    userId: user.id,
    email: user.email ?? null,
    role: roleRow.role as Role,
  };
}
