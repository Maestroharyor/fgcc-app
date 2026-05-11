import { ArrowUpRight, BarChart3, ScanLine, Star, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import type { DBRegistration, DBTrackCapacity } from "@/lib/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard · SkillUp Admin",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const [
    { data: rows, count: totalRegistered },
    attendedRes,
    waitlistRes,
    recentRes,
    capRes,
  ] = await Promise.all([
    supabase
      .from("registrations")
      .select("registered_via", { count: "exact", head: false }),
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("attended", true),
    supabase.from("waitlist").select("*", { count: "exact", head: true }),
    supabase
      .from("registrations")
      .select(
        "id, reference_number, full_name, email, created_at, registered_via, track_id",
      )
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("v_track_capacity")
      .select("*")
      .order("current_count", { ascending: false }),
  ]);

  const total = totalRegistered ?? 0;
  const attended = attendedRes.count ?? 0;
  const waitlist = waitlistRes.count ?? 0;
  const selfCount = (rows ?? []).filter(
    (r) => (r as { registered_via: string }).registered_via === "self",
  ).length;
  const othersCount = (rows ?? []).filter(
    (r) => (r as { registered_via: string }).registered_via === "others",
  ).length;
  const recent = (recentRes.data ?? []) as Array<Partial<DBRegistration>>;
  const capacity = (capRes.data ?? []) as DBTrackCapacity[];

  return (
    <div className="px-6 md:px-10 py-10">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-primary-blue)]">
          Overview
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--color-text-navy)]">
          SkillUp 1.0 — live snapshot
        </h1>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          Icon={Users}
          label="Registrations"
          value={total.toString()}
          tone="blue"
        />
        <StatCard
          Icon={ScanLine}
          label="Checked in"
          value={attended.toString()}
          tone="gold"
        />
        <StatCard
          Icon={BarChart3}
          label="On waitlist"
          value={waitlist.toString()}
          tone="coral"
        />
        <StatCard
          Icon={Star}
          label="Self / Others"
          value={`${selfCount} / ${othersCount}`}
          tone="navy"
        />
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[2fr_1.4fr] gap-6">
        <Panel title="By track" subtitle="Current count vs capacity">
          <div className="flex flex-col gap-3">
            {capacity.map((c) => {
              const pct = Math.min(
                100,
                (c.current_count / Math.max(c.capacity, 1)) * 100,
              );
              return (
                <div key={c.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-display font-medium text-[var(--color-text-navy)]">
                      {c.name}
                    </span>
                    <span className="font-mono text-xs text-[var(--color-text-navy)]/60">
                      {c.current_count} / {c.capacity}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-text-navy)]/8">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary-blue)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {capacity.length === 0 && (
              <p className="text-sm text-[var(--color-text-navy)]/55">
                No tracks yet. Apply the 002 seed migration to populate them.
              </p>
            )}
          </div>
        </Panel>

        <Panel
          title="Latest registrations"
          subtitle="Most recent 10"
          action={
            <Link
              href="/admin/registrations"
              className="inline-flex items-center gap-1 font-display text-xs font-semibold text-[var(--color-primary-blue)]"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        >
          <div className="flex flex-col gap-2">
            {recent.length === 0 && (
              <p className="text-sm text-[var(--color-text-navy)]/55">
                No registrations yet.
              </p>
            )}
            {recent.map((r) => (
              <Link
                key={r.id}
                href={`/admin/registrations/${r.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-text-navy)]/8 bg-white px-3 py-2 hover:bg-[var(--color-neutral-cream-100)]"
              >
                <div className="min-w-0">
                  <div className="truncate font-display text-sm font-medium text-[var(--color-text-navy)]">
                    {r.full_name}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-navy)]/55">
                    {r.reference_number}
                  </div>
                </div>
                <div className="text-right text-xs text-[var(--color-text-navy)]/60 shrink-0">
                  {new Date(r.created_at ?? "").toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function StatCard({
  Icon,
  label,
  value,
  tone,
}: {
  Icon: typeof Users;
  label: string;
  value: string;
  tone: "blue" | "gold" | "coral" | "navy";
}) {
  const map = {
    blue: "from-[var(--color-primary-blue)]/8 text-[var(--color-primary-blue)]",
    gold: "from-[var(--color-warm-gold)]/12 text-[var(--color-warm-gold-600)]",
    coral:
      "from-[var(--color-accent-coral)]/8 text-[var(--color-accent-coral)]",
    navy: "from-[var(--color-text-navy)]/6 text-[var(--color-text-navy)]",
  };
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--color-text-navy)]/8 bg-white p-5 shadow-[var(--shadow-card)] bg-gradient-to-br ${map[tone]} to-transparent`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-80">
          {label}
        </span>
        <Icon className="h-4 w-4 opacity-60" aria-hidden />
      </div>
      <div className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--color-text-navy)]">
        {value}
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-text-navy)]/8 bg-white p-6 shadow-[var(--shadow-card)]">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-navy)]">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-[var(--color-text-navy)]/55">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
