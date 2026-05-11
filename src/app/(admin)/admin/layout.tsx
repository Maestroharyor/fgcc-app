import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getCurrentRole } from "@/lib/auth/require-role";

/**
 * Wraps every authenticated /admin/* page. `/admin/login` lives under the
 * sibling (admin-public) route group so it doesn't inherit this gate.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getCurrentRole();
  if (!session) redirect("/admin/login");

  return (
    <div className="flex flex-col md:flex-row min-h-dvh bg-cream">
      <AdminSidebar role={session.role} email={session.email} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
