import type { Metadata } from "next";
import { Suspense } from "react";
import { AttendanceBoard } from "@/components/admin/AttendanceBoard";
import { CheckinForm } from "@/components/admin/CheckinForm";
import { requireRole } from "@/lib/auth/require-role";
import { getAttendanceBoard } from "@/lib/db/registrations";
import { formatDate } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Check-in · SkillUp Admin",
  robots: { index: false, follow: false },
};

export default async function CheckinPage() {
  await requireRole("admin");

  return (
    <div className="px-6 md:px-10 py-10">
      <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
        Event day
      </span>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
        Check-in
      </h1>
      <p className="mt-1 text-sm text-navy/65">
        Scan the QR (or type the reference) on a registrant's email to mark them
        present.
      </p>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <CheckinForm />
        <Suspense fallback={<TallySkeleton />}>
          <TallyAside />
        </Suspense>
      </div>

      <div className="mt-6">
        <Suspense fallback={<AttendanceBoardSkeleton />}>
          <AttendanceSection />
        </Suspense>
      </div>
    </div>
  );
}

async function TallyAside() {
  const entries = await getAttendanceBoard();
  const today = formatDate(new Date(), "yyyy-MM-dd");
  const total = entries.length;
  const cumulative = entries.filter((e) => e.attended).length;
  const presentToday = entries.filter(
    (e) =>
      e.attended_at &&
      formatDate(new Date(e.attended_at), "yyyy-MM-dd") === today,
  ).length;
  return (
    <aside className="rounded-3xl border border-navy/8 bg-white p-6 shadow-card">
      <div className="font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
        Present today
      </div>
      <div className="mt-2 font-display text-5xl font-semibold text-navy">
        {presentToday}
        <span className="text-2xl text-navy/40">
          {" / "}
          {total}
        </span>
      </div>
      <p className="mt-2 text-xs text-navy/55">
        {cumulative} checked in across all days.
      </p>
    </aside>
  );
}

async function AttendanceSection() {
  const entries = await getAttendanceBoard();
  return <AttendanceBoard entries={entries} />;
}

function TallySkeleton() {
  return (
    <aside className="rounded-3xl border border-navy/8 bg-white p-6 shadow-card">
      <div className="font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
        Present today
      </div>
      <div className="mt-2 h-12 w-32 rounded-md bg-navy/8 animate-pulse" />
      <p className="mt-2 text-xs text-navy/55">Counting check-ins…</p>
    </aside>
  );
}

function AttendanceBoardSkeleton() {
  return (
    <section className="rounded-3xl border border-navy/8 bg-white p-6 shadow-card">
      <div className="h-5 w-40 rounded bg-navy/8 animate-pulse" />
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        <div className="h-64 rounded-2xl bg-navy/5 animate-pulse" />
        <div className="h-64 rounded-2xl bg-navy/5 animate-pulse" />
      </div>
    </section>
  );
}
