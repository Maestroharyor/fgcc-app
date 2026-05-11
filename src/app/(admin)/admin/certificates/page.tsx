import { Download } from "lucide-react";
import type { Metadata } from "next";
import { CertificateActions } from "@/components/admin/CertificateActions";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Certificates · SkillUp Admin",
  robots: { index: false, follow: false },
};

export default async function CertificatesPage() {
  await requireRole("superadmin");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("registrations")
    .select(
      "id, full_name, email, reference_number, attended, certificate_sent_at, tracks(name)",
    )
    .eq("attended", true)
    .order("created_at", { ascending: false });

  type Row = {
    id: string;
    full_name: string;
    email: string;
    reference_number: string;
    attended: boolean;
    certificate_sent_at: string | null;
    tracks: { name: string } | { name: string }[] | null;
  };
  const rows = (data ?? []) as Row[];

  return (
    <div className="px-6 md:px-10 py-10">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
        Superadmin · Certificates
      </span>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
        Certificates of participation
      </h1>
      <p className="mt-1 text-sm text-navy/65">
        {rows.length} checked-in attendees. Preview, download, or email — every
        send requires explicit confirmation in the UI below.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
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
            <tr className="text-left font-mono text-[10px] uppercase tracking-[0.18em] text-navy/55">
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Track</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-navy/55"
                >
                  Nobody has been checked in yet. Mark attendance first.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const trackName = Array.isArray(r.tracks)
                ? (r.tracks[0]?.name ?? "")
                : (r.tracks?.name ?? "");
              const sent = Boolean(r.certificate_sent_at);
              return (
                <tr
                  key={r.id}
                  className="border-t border-navy/6 hover:bg-cream"
                >
                  <td className="px-4 py-3 font-mono text-[12px] text-primary">
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
                      className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${
                        sent
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-navy/8 text-navy/60"
                      }`}
                    >
                      {sent ? "Sent" : "Not sent"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CertificateActions reference={r.reference_number} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
