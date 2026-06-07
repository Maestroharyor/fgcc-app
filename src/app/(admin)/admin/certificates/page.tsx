import { Download } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CertificateActions } from "@/components/admin/CertificateActions";
import { SignatoryEditor } from "@/components/admin/SignatoryEditor";
import { TRACKS_BY_CODE } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import { getSignatories, getSignatureSignedUrl } from "@/lib/db/signatories";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Certificates · SkillUp Admin",
  robots: { index: false, follow: false },
};

export default async function CertificatesPage() {
  await requireRole("superadmin");

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
        Signatories
      </h2>
      <p className="mt-1 text-sm text-navy/65">
        The chairman and convener sign every certificate. Upload each signature
        as a PNG and set the caption printed beneath it.
      </p>
      <Suspense fallback={<SignatoriesSkeleton />}>
        <SignatoriesPanel />
      </Suspense>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <a
          href="/api/admin/certificates/download"
          download
          className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-4 py-2 font-display text-sm font-semibold text-navy hover:bg-cream-100"
        >
          <Download className="h-4 w-4" aria-hidden /> Download ALL as ZIP
        </a>
        <CertificateActions bulk />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-navy/8 bg-white shadow-card">
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
          <Suspense fallback={<CertificatesTbodySkeleton />}>
            <CertificatesTbody />
          </Suspense>
        </table>
      </div>
    </div>
  );
}

async function SignatoriesPanel() {
  const signatories = await getSignatories();
  const withUrls = await Promise.all(
    signatories.map(async (s) => ({
      ...s,
      imageUrl: s.image_path ? await getSignatureSignedUrl(s.image_path) : null,
    })),
  );

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 max-w-3xl">
      {withUrls.map((s) => (
        <SignatoryEditor
          key={s.slot}
          slot={s.slot}
          name={s.name}
          title={s.title}
          imageUrl={s.imageUrl}
        />
      ))}
    </div>
  );
}

function SignatoriesSkeleton() {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 max-w-3xl">
      {["chairman", "convener"].map((slot) => (
        <div
          key={slot}
          className="h-72 rounded-2xl border border-navy/8 bg-white shadow-card animate-pulse"
        />
      ))}
    </div>
  );
}

async function CertificatesTbody() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("registrations")
    .select(
      "id, full_name, email, reference_number, attended, certificate_sent_at, track_code",
    )
    .order("created_at", { ascending: false });

  type Row = {
    id: string;
    full_name: string;
    email: string;
    reference_number: string;
    attended: boolean;
    certificate_sent_at: string | null;
    track_code: string;
  };
  const rows = (data ?? []) as Row[];

  return (
    <tbody>
      {rows.length === 0 && (
        <tr>
          <td
            colSpan={6}
            className="px-4 py-10 text-center text-sm text-navy/55"
          >
            No registrations yet.
          </td>
        </tr>
      )}
      {rows.map((r) => {
        const trackName = TRACKS_BY_CODE[r.track_code]?.name ?? r.track_code;
        const sent = Boolean(r.certificate_sent_at);
        return (
          <tr key={r.id} className="border-t border-navy/6 hover:bg-cream">
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
                {r.attended ? "Attended" : "Registered"}
              </span>
            </td>
            <td className="px-4 py-3">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 font-sans text-[10px] uppercase tracking-[0.16em] ${
                  sent
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-navy/8 text-navy/60"
                }`}
              >
                {sent ? "Sent" : "Not sent"}
              </span>
            </td>
            <td className="px-4 py-3">
              <CertificateActions
                reference={r.reference_number}
                attended={r.attended}
              />
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}

function CertificatesTbodySkeleton() {
  return (
    <tbody>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr
          key={`cert-skel-${
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder
            i
          }`}
          className="border-t border-navy/6"
        >
          <td className="px-4 py-3">
            <span className="block h-3 w-20 rounded bg-navy/8 animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <span className="block h-4 w-40 rounded bg-navy/8 animate-pulse" />
            <span className="mt-1 block h-3 w-32 rounded bg-navy/8 animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <span className="block h-3 w-32 rounded bg-navy/8 animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <span className="block h-5 w-20 rounded-full bg-navy/8 animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <span className="block h-5 w-16 rounded-full bg-navy/8 animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <span className="block h-7 w-32 rounded-full bg-navy/8 animate-pulse" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}
