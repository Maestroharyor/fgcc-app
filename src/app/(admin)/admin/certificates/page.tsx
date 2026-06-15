import { addDays } from "date-fns";
import { Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CertificateActions } from "@/components/admin/CertificateActions";
import { CertificateScheduler } from "@/components/admin/CertificateScheduler";
import { CertificateScheduleView } from "@/components/admin/CertificateScheduleView";
import { CertificateStatusBadge } from "@/components/admin/CertificateStatusBadge";
import { CertificatesFilters } from "@/components/admin/CertificatesFilters";
import { SignatoryEditor } from "@/components/admin/SignatoryEditor";
import { TRACKS, TRACKS_BY_CODE } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import {
  countCertificateStatuses,
  getCertificateSchedule,
  listRegistrations,
} from "@/lib/db/registrations";
import { getSignatory, getSignatureSignedUrl } from "@/lib/db/signatories";
import { attendanceDayKey, eventDays } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Certificates · SkillUp Admin",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    track?: string;
    attended?: "yes" | "no";
    sent?: "yes" | "no";
  }>;
}

export default async function CertificatesPage({ searchParams }: PageProps) {
  await requireRole("superadmin");
  const params = await searchParams;

  return (
    <div className="px-6 md:px-10 py-10">
      <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
        Superadmin · Certificates
      </span>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
        Certificates of participation
      </h1>
      <p className="mt-1 text-sm text-navy/65">
        Preview any registrant&apos;s certificate, then download or email the
        ones marked present - every send requires explicit confirmation in the
        UI below.
      </p>

      <h2 className="mt-8 font-display text-lg font-semibold text-navy">
        Signatory
      </h2>
      <p className="mt-1 text-sm text-navy/65">
        The chairman signs every certificate. Upload the signature as a PNG and
        set the caption printed beneath it.
      </p>
      <Suspense fallback={<SignatorySkeleton />}>
        <SignatoryPanel />
      </Suspense>

      <h2 className="mt-10 font-display text-lg font-semibold text-navy">
        Send certificates
      </h2>
      <p className="mt-1 text-sm text-navy/65">
        Batched across days to stay under Resend&apos;s free-plan cap. Track
        each recipient&apos;s status below and resend any that fail.
      </p>
      <Suspense fallback={<PanelSkeleton />}>
        <SchedulePanels />
      </Suspense>

      <div className="mt-8">
        <a
          href="/api/admin/certificates/download"
          download
          className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-4 py-2 font-display text-sm font-semibold text-navy hover:bg-cream-100"
        >
          <Download className="h-4 w-4" aria-hidden /> Download ALL as ZIP
        </a>
      </div>

      {/* Live filters drive the URL search params (no Apply, soft navigation).
          Suspense is required because the component reads useSearchParams. */}
      <Suspense
        fallback={
          <div className="mt-6 h-11 rounded-full bg-navy/5 animate-pulse" />
        }
      >
        <CertificatesFilters />
      </Suspense>

      <Suspense fallback={<CertificatesTableSkeleton />}>
        <CertificatesTable params={params} />
      </Suspense>
    </div>
  );
}

async function SignatoryPanel() {
  const signatory = await getSignatory();
  const imageUrl = signatory.image_path
    ? await getSignatureSignedUrl(signatory.image_path)
    : null;

  return (
    <div className="mt-4 max-w-sm">
      <SignatoryEditor
        slot={signatory.slot}
        name={signatory.name}
        title={signatory.title}
        imageUrl={imageUrl}
      />
    </div>
  );
}

function SignatorySkeleton() {
  return (
    <div className="mt-4 max-w-sm">
      <div className="h-72 rounded-2xl border border-navy/8 bg-white shadow-card animate-pulse" />
    </div>
  );
}

async function SchedulePanels() {
  const todayKey = attendanceDayKey();
  const tomorrowKey = attendanceDayKey(addDays(new Date(), 1));
  const [schedule, counts] = await Promise.all([
    getCertificateSchedule(),
    countCertificateStatuses(),
  ]);
  const tracks = TRACKS.map((t) => ({ code: t.code, name: t.name }));

  return (
    <div className="mt-5 space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Awaiting" value={counts.none} tone="navy" />
        <StatCard label="Scheduled" value={counts.scheduled} tone="primary" />
        <StatCard label="Sent" value={counts.sent} tone="emerald" />
        <StatCard label="Failed" value={counts.failed} tone="red" />
      </div>
      <CertificateScheduler
        days={eventDays()}
        tracks={tracks}
        defaultStartDate={tomorrowKey}
        minStartDate={todayKey}
      />
      <CertificateScheduleView days={schedule} todayKey={todayKey} />
    </div>
  );
}

const STAT_TONE: Record<string, string> = {
  navy: "text-navy",
  primary: "text-primary",
  emerald: "text-emerald-700",
  red: "text-red-700",
};

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof STAT_TONE;
}) {
  return (
    <div className="rounded-2xl border border-navy/8 bg-white p-4 shadow-card">
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
    <div className="mt-5 space-y-6">
      <div className="h-20 rounded-2xl border border-navy/8 bg-white shadow-card animate-pulse" />
      <div className="h-64 rounded-2xl border border-navy/8 bg-white shadow-card animate-pulse" />
    </div>
  );
}

interface CertificatesTableParams {
  q?: string;
  page?: string;
  track?: string;
  attended?: "yes" | "no";
  sent?: "yes" | "no";
}

async function CertificatesTable({
  params,
}: {
  params: CertificatesTableParams;
}) {
  const page = Number(params.page ?? "1") || 1;
  const { rows, total, pageSize } = await listRegistrations({
    query: params.q,
    trackCode: params.track,
    attended:
      params.attended === "yes"
        ? true
        : params.attended === "no"
          ? false
          : undefined,
    certificateSent:
      params.sent === "yes" ? true : params.sent === "no" ? false : undefined,
    page,
    pageSize: 50,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const buildHref = (overrides: Record<string, string | number>) => {
    const sp = new URLSearchParams();
    const merge = { ...params, ...overrides };
    for (const [k, v] of Object.entries(merge)) {
      if (v !== undefined && v !== "" && v !== null) sp.set(k, String(v));
    }
    return `/admin/certificates?${sp.toString()}`;
  };

  return (
    <>
      <p className="mt-6 mb-3 text-sm text-navy/65">
        {total.toLocaleString()} total
      </p>
      <div className="overflow-hidden rounded-2xl border border-navy/8 bg-white shadow-card">
        <table className="min-w-full text-sm">
          <thead className="bg-cream-100">
            <tr className="text-left font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Track</th>
              <th className="px-4 py-3">Attendance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-navy/55"
                >
                  No matching registrations.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const trackName =
                TRACKS_BY_CODE[r.track_code]?.name ?? r.track_code;
              const days = r.attendance_log?.length ?? 0;
              return (
                <tr
                  key={r.id}
                  className="border-t border-navy/6 hover:bg-cream"
                >
                  <td className="px-4 py-3 font-sans text-[12px] text-primary">
                    {r.reference_number}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-display font-medium text-navy">
                      {r.full_name}
                    </div>
                    <div className="text-xs text-navy/55">{r.email}</div>
                  </td>
                  <td className="px-4 py-3">{trackName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 font-sans text-[10px] uppercase tracking-[0.16em] ${
                        r.attended
                          ? "bg-primary/8 text-primary"
                          : "bg-navy/8 text-navy/60"
                      }`}
                    >
                      {r.attended
                        ? days > 1
                          ? `Attended · ${days} days`
                          : "Attended"
                        : "Registered"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CertificateStatusBadge
                      status={r.certificate_status}
                      scheduledFor={r.certificate_scheduled_for}
                      error={r.certificate_error}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <CertificateActions
                      reference={r.reference_number}
                      attended={r.attended}
                      status={r.certificate_status}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-navy/6 text-xs">
          <span className="text-navy/55">
            {total === 0
              ? "0 records"
              : `Showing ${(page - 1) * pageSize + 1} – ${Math.min(page * pageSize, total)} of ${total}`}
          </span>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={buildHref({ page: page - 1 })}
                className="rounded-full border border-navy/15 px-3 py-1 font-display font-medium text-navy hover:bg-cream-100"
              >
                Previous
              </Link>
            )}
            <span className="font-sans text-navy/55">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={buildHref({ page: page + 1 })}
                className="rounded-full border border-navy/15 px-3 py-1 font-display font-medium text-navy hover:bg-cream-100"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function CertificatesTableSkeleton() {
  return (
    <div className="mt-6 rounded-2xl border border-navy/8 bg-white shadow-card overflow-hidden">
      <div className="space-y-px">
        {["a", "b", "c", "d", "e", "f"].map((row) => (
          <div key={`cert-skel-${row}`} className="px-4 py-4">
            <span className="block h-4 w-2/3 rounded bg-navy/8 animate-pulse" />
            <span className="mt-2 block h-3 w-1/3 rounded bg-navy/8 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
