import { addDays } from "date-fns";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CertificateScheduler } from "@/components/admin/CertificateScheduler";
import { CertificateScheduleView } from "@/components/admin/CertificateScheduleView";
import { CertificateTestEmail } from "@/components/admin/CertificateTestEmail";
import { TRACKS, TRACKS_BY_CODE } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import {
  countCertificateStatuses,
  getCertificateSchedule,
  listNoEmailAttendees,
} from "@/lib/db/registrations";
import { formatDate } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Send certificates · SkillUp Admin",
  robots: { index: false, follow: false },
};

export default async function CertificatesSendPage() {
  await requireRole("superadmin");

  return (
    <div className="px-6 md:px-10 py-10">
      <Link
        href="/admin/certificates"
        className="inline-flex items-center gap-1 text-sm font-display font-medium text-navy/70 hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to certificates
      </Link>

      <span className="mt-4 block font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
        Superadmin · Certificates
      </span>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
        Send certificates
      </h1>
      <p className="mt-1 text-sm text-navy/65">
        Everyone who attended and has an email is eligible. Batches go out daily
        to stay under Resend&apos;s free-plan cap. Track each recipient&apos;s
        status below and resend any that fail.
      </p>

      <div className="mt-6">
        <CertificateTestEmail />
      </div>

      <Suspense fallback={<PanelSkeleton />}>
        <SchedulePanels />
      </Suspense>
    </div>
  );
}

async function SchedulePanels() {
  const now = new Date();
  const nowIso = now.toISOString();
  // datetime-local defaults, in Lagos: now (as the min) and tomorrow 09:00.
  const minStartAt = formatDate(now, "yyyy-MM-dd'T'HH:mm");
  const defaultStartAt = `${formatDate(addDays(now, 1), "yyyy-MM-dd")}T09:00`;
  const [schedule, counts, noEmailAttendees] = await Promise.all([
    getCertificateSchedule(),
    countCertificateStatuses(),
    listNoEmailAttendees(),
  ]);
  const tracks = TRACKS.map((t) => ({ code: t.code, name: t.name }));

  const totalAttended =
    counts.none +
    counts.scheduled +
    counts.sent +
    counts.failed +
    counts.noEmail;

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Attended" value={totalAttended} tone="primary" lead />
        <StatCard label="Awaiting" value={counts.none} tone="navy" />
        <StatCard label="Scheduled" value={counts.scheduled} tone="navy" />
        <StatCard label="Sent" value={counts.sent} tone="emerald" />
        <StatCard label="Failed" value={counts.failed} tone="red" />
        <StatCard label="No email" value={counts.noEmail} tone="amber" />
      </div>
      <p className="-mt-3 text-xs text-navy/55">
        {totalAttended} attended in total ={" "}
        {counts.none + counts.scheduled + counts.sent + counts.failed} with an
        email + {counts.noEmail} with none.
      </p>
      <NoEmailList attendees={noEmailAttendees} />
      <CertificateScheduler
        tracks={tracks}
        defaultStartAt={defaultStartAt}
        minStartAt={minStartAt}
      />
      <CertificateScheduleView days={schedule} nowIso={nowIso} />
    </div>
  );
}

function NoEmailList({
  attendees,
}: {
  attendees: Awaited<ReturnType<typeof listNoEmailAttendees>>;
}) {
  if (attendees.length === 0) return null;
  const withRegistrar = attendees.filter((a) => a.submitter_email).length;
  return (
    <details className="rounded-2xl border border-navy/8 bg-white shadow-card">
      <summary className="cursor-pointer list-none px-5 py-4 font-display text-sm font-semibold text-navy">
        <span className="text-amber-700">{attendees.length}</span> attendees
        with no email{" "}
        <span className="font-sans text-xs font-normal text-navy/55">
          ({withRegistrar} reachable via registrar ·{" "}
          {attendees.length - withRegistrar} print-only)
        </span>
      </summary>
      <div className="max-h-80 overflow-y-auto border-t border-navy/8">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-cream-100">
            <tr className="text-left font-sans text-[10px] uppercase tracking-[0.16em] text-navy/55">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Ref</th>
              <th className="px-4 py-2.5">Track</th>
              <th className="px-4 py-2.5">Registrar</th>
            </tr>
          </thead>
          <tbody>
            {attendees.map((a) => (
              <tr key={a.reference_number} className="border-t border-navy/6">
                <td className="px-4 py-2 font-display font-medium text-navy">
                  {a.full_name}
                </td>
                <td className="px-4 py-2 font-sans text-[12px] text-primary">
                  {a.reference_number}
                </td>
                <td className="px-4 py-2 text-navy/70">
                  {TRACKS_BY_CODE[a.track_code]?.name ?? a.track_code}
                </td>
                <td className="px-4 py-2 text-navy/70">
                  {a.submitter_email ? (
                    <span>
                      {a.submitter_name ?? "—"}{" "}
                      <span className="text-navy/45">{a.submitter_email}</span>
                    </span>
                  ) : (
                    <span className="text-amber-700">Print only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

const STAT_TONE: Record<string, string> = {
  navy: "text-navy",
  primary: "text-primary",
  emerald: "text-emerald-700",
  red: "text-red-700",
  amber: "text-amber-700",
};

function StatCard({
  label,
  value,
  tone,
  lead = false,
}: {
  label: string;
  value: number;
  tone: keyof typeof STAT_TONE;
  /** The total card - given a tinted background so it reads as the headline. */
  lead?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-card ${
        lead ? "border-primary/20 bg-primary/5" : "border-navy/8 bg-white"
      }`}
    >
      <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
        {label}
      </span>
      <div
        className={`mt-1 font-display text-2xl font-semibold ${STAT_TONE[tone]}`}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="mt-6 space-y-6">
      <div className="h-20 rounded-2xl border border-navy/8 bg-white shadow-card animate-pulse" />
      <div className="h-64 rounded-2xl border border-navy/8 bg-white shadow-card animate-pulse" />
    </div>
  );
}
