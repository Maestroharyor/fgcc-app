import { ArrowLeft, Mail, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { trackByCode } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import { getRegistrationById } from "@/lib/db/registrations";
import { qrDataUrl } from "@/lib/qr/generate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registrant · SkillUp Admin",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RegistrantProfile({ params }: Props) {
  const session = await requireRole("admin");
  const { id } = await params;
  const registration = await getRegistrationById(id);
  if (!registration) notFound();

  const track = trackByCode(registration.track_code);

  const qr = await qrDataUrl(registration.reference_number);

  return (
    <div className="px-6 md:px-10 py-10">
      <Link
        href="/admin/registrations"
        className="inline-flex items-center gap-1 text-sm font-display font-medium text-navy/70 hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to all registrations
      </Link>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        <section className="rounded-2xl border border-navy/8 bg-white p-6 shadow-card">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            Registrant profile
          </span>
          <h1 className="mt-2 font-display text-3xl font-semibold text-navy">
            {registration.full_name}
          </h1>

          <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <Row label="Reference">
              <span className="font-mono text-primary">
                {registration.reference_number}
              </span>
            </Row>
            <Row label="Track">{track?.name ?? "—"}</Row>
            <Row label="Facilitator">{track?.facilitator ?? "TBA"}</Row>
            <Row label="Registered via">
              {registration.registered_via === "self" ? "Self" : "Someone else"}
            </Row>
            <Row label="Email">
              <a
                href={`mailto:${registration.email}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden />{" "}
                {registration.email}
              </a>
            </Row>
            <Row label="Phone">
              <a
                href={`tel:${registration.phone}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden />{" "}
                {registration.phone}
              </a>
            </Row>
            <Row label="Gender">{registration.gender}</Row>
            <Row label="Age group">
              {registration.age_group.replace("_", " ")}
            </Row>
            <Row label="Church">{registration.church ?? "—"}</Row>
            <Row label="Registered at">
              {new Date(registration.created_at).toLocaleString()}
            </Row>
            <Row label="Attended">{registration.attended ? "Yes" : "No"}</Row>
            <Row label="Attended at">
              {registration.attended_at
                ? new Date(registration.attended_at).toLocaleString()
                : "—"}
            </Row>
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <form action="/api/admin/checkin" method="post">
              <input
                type="hidden"
                name="reference_number"
                value={registration.reference_number}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-display text-sm font-semibold text-white hover:bg-primary-700"
              >
                {registration.attended ? "Re-mark attended" : "Mark attended"}
              </button>
            </form>
            {session.role === "superadmin" && (
              <form
                action={`/api/admin/registrations/${registration.id}/delete`}
                method="post"
              >
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full border border-coral/30 bg-white px-4 py-2 font-display text-sm font-semibold text-coral hover:bg-coral/8"
                >
                  Delete registration
                </button>
              </form>
            )}
          </div>
        </section>

        <aside className="rounded-2xl border border-navy/8 bg-white p-6 shadow-card flex flex-col items-center text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            Check-in QR
          </span>
          {/* biome-ignore lint/performance/noImgElement: data URL */}
          <img
            src={qr}
            alt={`QR code for ${registration.reference_number}`}
            width={220}
            height={220}
            className="mt-3 rounded-2xl border border-navy/8"
          />
          <p className="mt-3 text-xs text-navy/55">
            Encodes the reference. Scannable from any QR reader.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-navy/6 pb-3 last:border-b-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-navy/55">
        {label}
      </dt>
      <dd className="text-sm text-navy">{children}</dd>
    </div>
  );
}
