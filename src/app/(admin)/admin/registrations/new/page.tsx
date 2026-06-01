import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminRegistrationForm } from "@/components/admin/AdminRegistrationForm";
import { requireRole } from "@/lib/auth/require-role";
import { getTrackCounts, withCapacity } from "@/lib/db/tracks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add registration · SkillUp Admin",
  robots: { index: false, follow: false },
};

export default async function AdminNewRegistrationPage() {
  await requireRole("admin");

  // Live counts let the form flag a full track without blocking the admin.
  const counts = await getTrackCounts();
  const tracks = withCapacity(counts).map((t) => ({
    code: t.code,
    name: t.name,
    current_count: t.current_count,
    capacity: t.capacity,
    is_full: t.is_full,
  }));

  return (
    <div className="px-6 md:px-10 py-10">
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-1.5 font-display text-xs font-medium text-primary hover:text-primary-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to dashboard
      </Link>
      <div className="mt-3 flex flex-col gap-1">
        <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
          Offline entry
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
          Add a registration
        </h1>
        <p className="text-sm text-navy/65">
          Enter a walk-in or offline sign-up. Email is optional, and a full
          track won't block you.
        </p>
      </div>

      <div className="mt-8 max-w-2xl rounded-2xl border border-navy/8 bg-white p-6 shadow-card">
        <AdminRegistrationForm tracks={tracks} />
      </div>
    </div>
  );
}
