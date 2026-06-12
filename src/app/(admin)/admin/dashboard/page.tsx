import {
  ArrowUpRight,
  BarChart3,
  Plus,
  ScanLine,
  Star,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TrackAttendanceBars } from "@/components/admin/TrackAttendanceBars";
import { TRACKS } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import { getAttendanceBoard } from "@/lib/db/registrations";
import { getTrackCounts, withCapacity } from "@/lib/db/tracks";
import type { DBRegistration } from "@/lib/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard · SkillUp Admin",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  await requireRole("admin");

  return (
    <div className="px-6 md:px-10 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
            Overview
          </span>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
            SkillUp 1.0 - live snapshot
          </h1>
        </div>
        <Link
          href="/admin/registrations/new"
          className="inline-flex h-11 w-fit items-center justify-center gap-1.5 rounded-full bg-primary px-5 font-display text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add registration
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Suspense
          fallback={
            <>
              <StatCardSkeleton
                Icon={Users}
                label="Registrations"
                tone="blue"
              />
              <StatCardSkeleton
                Icon={Star}
                label="Self / Others / Offline"
                tone="navy"
              />
            </>
          }
        >
          <RegistrationsTotalsCards />
        </Suspense>
        <Suspense
          fallback={
            <StatCardSkeleton Icon={ScanLine} label="Checked in" tone="gold" />
          }
        >
          <AttendedCard />
        </Suspense>
        <Suspense
          fallback={
            <StatCardSkeleton
              Icon={BarChart3}
              label="On waitlist"
              tone="coral"
            />
          }
        >
          <WaitlistCard />
        </Suspense>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[2fr_1.4fr] gap-6">
        <Suspense fallback={<ByTrackPanelSkeleton />}>
          <ByTrackPanel />
        </Suspense>
        <Suspense fallback={<RecentRegistrationsPanelSkeleton />}>
          <RecentRegistrationsPanel />
        </Suspense>
      </div>

      <div className="mt-6">
        <Suspense fallback={<AttendanceByTrackPanelSkeleton />}>
          <AttendanceByTrackPanel />
        </Suspense>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Suspense children - each owns one fetch.
// ─────────────────────────────────────────────────────────────────────────────

async function RegistrationsTotalsCards() {
  const supabase = await createSupabaseServerClient();
  const { data: rows, count: totalRegistered } = await supabase
    .from("registrations")
    .select("registered_via", { count: "exact", head: false });

  const total = totalRegistered ?? 0;
  const via = (r: unknown) => (r as { registered_via: string }).registered_via;
  const selfCount = (rows ?? []).filter((r) => via(r) === "self").length;
  const othersCount = (rows ?? []).filter((r) => via(r) === "others").length;
  const offlineCount = (rows ?? []).filter((r) => via(r) === "offline").length;

  return (
    <>
      <StatCard
        Icon={Users}
        label="Registrations"
        value={total.toString()}
        tone="blue"
      />
      <StatCard
        Icon={Star}
        label="Self / Others / Offline"
        value={`${selfCount} / ${othersCount} / ${offlineCount}`}
        tone="navy"
      />
    </>
  );
}

async function AttendedCard() {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("attended", true);
  return (
    <StatCard
      Icon={ScanLine}
      label="Checked in"
      value={(count ?? 0).toString()}
      tone="gold"
    />
  );
}

async function WaitlistCard() {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("waitlist")
    .select("*", { count: "exact", head: true });
  return (
    <StatCard
      Icon={BarChart3}
      label="On waitlist"
      value={(count ?? 0).toString()}
      tone="coral"
    />
  );
}

async function ByTrackPanel() {
  const counts = await getTrackCounts();
  const capacity = withCapacity(counts).sort(
    (a, b) => b.current_count - a.current_count,
  );
  return (
    <Panel title="By track" subtitle="Current count vs capacity">
      <div className="flex flex-col gap-3">
        {capacity.map((c) => {
          const pct = Math.min(
            100,
            (c.current_count / Math.max(c.capacity, 1)) * 100,
          );
          return (
            <div key={c.code} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-display font-medium text-navy">
                  {c.name}
                </span>
                <span className="font-sans text-xs text-navy/60">
                  {c.current_count} / {c.capacity}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-navy/8">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {capacity.length === 0 && (
          <p className="text-sm text-navy/55">
            No tracks yet. Apply the 002 seed migration to populate them.
          </p>
        )}
      </div>
    </Panel>
  );
}

async function RecentRegistrationsPanel() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("registrations")
    .select(
      "id, reference_number, full_name, email, created_at, registered_via, track_code",
    )
    .order("created_at", { ascending: false })
    .limit(10);
  const recent = (data ?? []) as Array<Partial<DBRegistration>>;
  return (
    <Panel
      title="Latest registrations"
      subtitle="Most recent 10"
      action={
        <Link
          href="/admin/registrations"
          className="inline-flex items-center gap-1 font-display text-xs font-semibold text-primary"
        >
          View all <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      }
    >
      <div className="flex flex-col gap-2">
        {recent.length === 0 && (
          <p className="text-sm text-navy/55">No registrations yet.</p>
        )}
        {recent.map((r) => (
          <Link
            key={r.id}
            href={`/admin/registrations/${r.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-navy/8 bg-white px-3 py-2 hover:bg-cream-100"
          >
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-medium text-navy">
                {r.full_name}
              </div>
              <div className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
                {r.reference_number}
              </div>
            </div>
            <div className="text-right text-xs text-navy/60 shrink-0">
              {r.created_at
                ? formatDate(new Date(r.created_at), "MMM d, yyyy")
                : "-"}
            </div>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

async function AttendanceByTrackPanel() {
  const entries = await getAttendanceBoard();
  const byCode = new Map<string, { present: number; registered: number }>();
  for (const e of entries) {
    const agg = byCode.get(e.track_code) ?? { present: 0, registered: 0 };
    agg.registered += 1;
    if (e.attended) agg.present += 1;
    byCode.set(e.track_code, agg);
  }
  const rows = TRACKS.map((t) => ({
    code: t.code,
    name: t.name,
    present: byCode.get(t.code)?.present ?? 0,
    registered: byCode.get(t.code)?.registered ?? 0,
  }))
    .filter((r) => r.registered > 0)
    .sort((a, b) => b.present - a.present);
  return (
    <Panel title="Attendance by track" subtitle="Checked in vs registered">
      <TrackAttendanceBars rows={rows} />
    </Panel>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Presentational helpers + skeletons.
// ─────────────────────────────────────────────────────────────────────────────

const STAT_TONE = {
  blue: "from-primary/8 text-primary",
  gold: "from-gold/12 text-gold-600",
  coral: "from-coral/8 text-coral",
  navy: "from-navy/6 text-navy",
} as const;

function StatCard({
  Icon,
  label,
  value,
  tone,
}: {
  Icon: typeof Users;
  label: string;
  value: string;
  tone: keyof typeof STAT_TONE;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-navy/8 bg-white p-5 shadow-card bg-linear-to-br ${STAT_TONE[tone]} to-transparent`}
    >
      <div className="flex items-center justify-between">
        <span className="font-sans text-[10px] uppercase tracking-[0.18em] opacity-80">
          {label}
        </span>
        <Icon className="h-4 w-4 opacity-60" aria-hidden />
      </div>
      <div className="mt-3 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-navy">
        {value}
      </div>
    </div>
  );
}

function StatCardSkeleton({
  Icon,
  label,
  tone,
}: {
  Icon: typeof Users;
  label: string;
  tone: keyof typeof STAT_TONE;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-navy/8 bg-white p-5 shadow-card bg-linear-to-br ${STAT_TONE[tone]} to-transparent`}
    >
      <div className="flex items-center justify-between">
        <span className="font-sans text-[10px] uppercase tracking-[0.18em] opacity-80">
          {label}
        </span>
        <Icon className="h-4 w-4 opacity-60" aria-hidden />
      </div>
      <div className="mt-3 h-9 w-20 rounded-md bg-navy/8 animate-pulse" />
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
    <section className="rounded-2xl border border-navy/8 bg-white p-6 shadow-card">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-navy">
            {title}
          </h2>
          {subtitle && <p className="text-xs text-navy/55">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function ByTrackPanelSkeleton() {
  return (
    <Panel title="By track" subtitle="Current count vs capacity">
      <div className="flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`bt-skel-${
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder
              i
            }`}
            className="flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="h-3 w-40 rounded bg-navy/8 animate-pulse" />
              <span className="h-3 w-12 rounded bg-navy/8 animate-pulse" />
            </div>
            <div className="h-1.5 rounded-full bg-navy/8 animate-pulse" />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AttendanceByTrackPanelSkeleton() {
  return (
    <Panel title="Attendance by track" subtitle="Checked in vs registered">
      <div className="flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`at-skel-${
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder
              i
            }`}
            className="flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="h-3 w-40 rounded bg-navy/8 animate-pulse" />
              <span className="h-3 w-12 rounded bg-navy/8 animate-pulse" />
            </div>
            <div className="h-1.5 rounded-full bg-navy/8 animate-pulse" />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function RecentRegistrationsPanelSkeleton() {
  return (
    <Panel title="Latest registrations" subtitle="Most recent 10">
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={`rr-skel-${
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder
              i
            }`}
            className="flex items-center justify-between gap-3 rounded-lg border border-navy/8 bg-white px-3 py-2"
          >
            <div className="min-w-0 flex flex-col gap-1.5 flex-1">
              <span className="h-4 w-40 rounded bg-navy/8 animate-pulse" />
              <span className="h-2.5 w-24 rounded bg-navy/8 animate-pulse" />
            </div>
            <span className="h-3 w-16 rounded bg-navy/8 animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </Panel>
  );
}
