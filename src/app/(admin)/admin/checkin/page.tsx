import type { Metadata } from "next";
import { CheckinForm } from "@/components/admin/CheckinForm";
import { requireRole } from "@/lib/auth/require-role";
import { countAttended } from "@/lib/db/registrations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Check-in · SkillUp Admin",
  robots: { index: false, follow: false },
};

export default async function CheckinPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const [attended, { count: total }] = await Promise.all([
    countAttended(),
    supabase.from("registrations").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="px-6 md:px-10 py-10">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-primary-blue)]">
        Event day
      </span>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--color-text-navy)]">
        Check-in
      </h1>
      <p className="mt-1 text-sm text-[var(--color-text-navy)]/65">
        Scan the QR (or type the reference) on a registrant's email to mark them
        present.
      </p>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <CheckinForm />
        <aside className="rounded-3xl border border-[var(--color-text-navy)]/8 bg-white p-6 shadow-[var(--shadow-card)]">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-primary-blue)]">
            Tally
          </div>
          <div className="mt-2 font-display text-5xl font-semibold text-[var(--color-text-navy)]">
            {attended}
            <span className="text-2xl text-[var(--color-text-navy)]/40">
              {" / "}
              {total ?? "—"}
            </span>
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-navy)]/55">
            People marked present so far.
          </p>
        </aside>
      </div>
    </div>
  );
}
