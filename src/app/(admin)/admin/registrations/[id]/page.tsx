import { ArrowLeft, Mail, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CertificateActions } from "@/components/admin/CertificateActions";
import { CertificateStatusBadge } from "@/components/admin/CertificateStatusBadge";
import { ChangeTrackButton } from "@/components/admin/ChangeTrackButton";
import { CheckinButton } from "@/components/admin/CheckinButton";
import { DeleteRegistrationButton } from "@/components/admin/DeleteRegistrationButton";
import { EditRegistrationButton } from "@/components/admin/EditRegistrationButton";
import { REGISTERED_VIA_LABEL } from "@/components/admin/RegistrationsTable";
import { ResendWhatsAppButton } from "@/components/admin/ResendWhatsAppButton";
import { trackByCode } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import { getBatchById } from "@/lib/db/batches";
import { getRegistrationById } from "@/lib/db/registrations";
import { getTrackCounts, withCapacity } from "@/lib/db/tracks";
import type { Role } from "@/lib/db/types";
import { formatDate } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registrant · SkillUp Admin",
  robots: { index: false, follow: false },
};

// Human labels so raw DB enum values render capitalised in the UI.
const GENDER_LABEL: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};
const AGE_GROUP_LABEL: Record<string, string> = {
  under_18: "Under 18",
  "18_25": "18–25",
  "26_35": "26–35",
  "36_plus": "36+",
};
const RELATIONSHIP_LABEL: Record<string, string> = {
  pastor: "Pastor",
  parent: "Parent",
  friend: "Friend",
  church_worker: "Church worker",
  other: "Other",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RegistrantProfile({ params }: Props) {
  const session = await requireRole("admin");
  const { id } = await params;

  return (
    <div className="px-6 md:px-10 py-10">
      <Link
        href="/admin/registrations"
        className="inline-flex items-center gap-1 text-sm font-display font-medium text-navy/70 hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to all registrations
      </Link>

      <div className="mt-4">
        <Suspense fallback={<RegistrantProfileSkeleton />}>
          <RegistrantProfileSection id={id} role={session.role} />
        </Suspense>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Suspense children - `getRegistrationById` is `cache()`-wrapped so both
//  children share one query.
// ─────────────────────────────────────────────────────────────────────────────

async function RegistrantProfileSection({
  id,
  role,
}: {
  id: string;
  role: Role;
}) {
  const registration = await getRegistrationById(id);
  if (!registration) notFound();
  const track = trackByCode(registration.track_code);
  // Every checked-in day; rows from before the attendance_log migration fall
  // back to the single legacy timestamp.
  const attendanceDays = registration.attendance_log?.length
    ? registration.attendance_log
    : registration.attended_at
      ? [registration.attended_at]
      : [];
  // Who registered this person, for "register for others" submissions.
  const batch = registration.batch_id
    ? await getBatchById(registration.batch_id)
    : null;
  // Live capacity for the change-track modal: full/closed targets get disabled.
  const trackOptions = withCapacity(await getTrackCounts()).map((t) => ({
    code: t.code,
    name: t.name,
    remaining: t.remaining,
    is_full: t.is_full,
  }));

  return (
    <section className="rounded-2xl border border-navy/8 bg-white p-6 shadow-card">
      <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
        Registrant profile
      </span>
      <h1 className="mt-2 font-display text-3xl font-semibold text-navy">
        {registration.full_name}
      </h1>

      <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <Row label="Reference">
          <span className="font-sans text-primary">
            {registration.reference_number}
          </span>
        </Row>
        <Row label="Track">{track?.name ?? "-"}</Row>
        <Row label="Facilitator">{track?.facilitator ?? "TBA"}</Row>
        <Row label="Registered via">
          {REGISTERED_VIA_LABEL[registration.registered_via] ??
            registration.registered_via}
        </Row>
        <Row label="Email">
          <a
            href={`mailto:${registration.email}`}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden /> {registration.email}
          </a>
        </Row>
        <Row label="Phone">
          {registration.phone ? (
            <a
              href={`tel:${registration.phone}`}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden /> {registration.phone}
            </a>
          ) : (
            "-"
          )}
        </Row>
        <Row label="Gender">
          {GENDER_LABEL[registration.gender] ?? registration.gender}
        </Row>
        <Row label="Age group">
          {AGE_GROUP_LABEL[registration.age_group] ?? registration.age_group}
        </Row>
        <Row label="Church">{registration.church ?? "-"}</Row>
        <Row label="Registered at">
          {formatDate(new Date(registration.created_at), "MMM d, yyyy")}
        </Row>
        <Row label="Attended">
          {registration.attended
            ? attendanceDays.length > 1
              ? `Yes · ${attendanceDays.length} days`
              : "Yes"
            : "No"}
        </Row>
        <Row label="Attended at">
          {attendanceDays.length === 0 ? (
            "-"
          ) : (
            <span className="flex flex-col gap-0.5">
              {attendanceDays.map((d) => (
                <span key={d}>
                  {formatDate(new Date(d), "EEE, MMM d 'at' h:mm a")}
                </span>
              ))}
            </span>
          )}
        </Row>
        <Row label="Certificate">
          <CertificateStatusBadge
            status={registration.certificate_status}
            scheduledFor={registration.certificate_scheduled_for}
            error={registration.certificate_error}
          />
        </Row>
        <Row label="Certificate sent at">
          {registration.certificate_sent_at
            ? formatDate(
                new Date(registration.certificate_sent_at),
                "EEE, MMM d 'at' h:mm a",
              )
            : "-"}
        </Row>
        {registration.certificate_status === "failed" &&
          registration.certificate_error && (
            <Row label="Certificate error">
              <span className="text-red-700">
                {registration.certificate_error}
              </span>
            </Row>
          )}
      </dl>

      {batch && (
        <div className="mt-6 rounded-xl border border-navy/8 bg-cream/50 p-5">
          <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
            Registered by
          </span>
          <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <Row label="Name">{batch.submitter_name}</Row>
            <Row label="Relationship">
              {RELATIONSHIP_LABEL[batch.relationship] ?? batch.relationship}
            </Row>
            <Row label="Email">
              <a
                href={`mailto:${batch.submitter_email}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden />{" "}
                {batch.submitter_email}
              </a>
            </Row>
            <Row label="Phone">
              <a
                href={`tel:${batch.submitter_phone}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden />{" "}
                {batch.submitter_phone}
              </a>
            </Row>
            {batch.church && <Row label="Church">{batch.church}</Row>}
          </dl>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-5 border-t border-navy/8 pt-6">
        <CheckinButton
          reference={registration.reference_number}
          attended={registration.attended}
        />
        <div className="flex flex-wrap items-center gap-3">
          {role === "superadmin" && (
            <CertificateActions
              reference={registration.reference_number}
              attended={registration.attended}
              status={registration.certificate_status}
            />
          )}
          <EditRegistrationButton
            id={registration.id}
            fullName={registration.full_name}
            email={registration.email}
            phone={registration.phone}
            gender={registration.gender}
            ageGroup={registration.age_group}
            church={registration.church}
          />
          <ChangeTrackButton
            id={registration.id}
            currentTrackCode={registration.track_code}
            tracks={trackOptions}
          />
          <ResendWhatsAppButton id={registration.id} />
          {role === "superadmin" && (
            <DeleteRegistrationButton
              id={registration.id}
              fullName={registration.full_name}
              reference={registration.reference_number}
            />
          )}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Skeletons + helpers.
// ─────────────────────────────────────────────────────────────────────────────

function RegistrantProfileSkeleton() {
  return (
    <section className="rounded-2xl border border-navy/8 bg-white p-6 shadow-card">
      <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
        Registrant profile
      </span>
      <div className="mt-2 h-9 w-64 rounded bg-navy/8 animate-pulse" />
      <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`prof-skel-${
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder
              i
            }`}
            className="flex flex-col gap-1.5 border-b border-navy/6 pb-3 last:border-b-0"
          >
            <span className="h-2.5 w-20 rounded bg-navy/8 animate-pulse" />
            <span className="h-4 w-40 rounded bg-navy/8 animate-pulse" />
          </div>
        ))}
      </dl>
      <div className="mt-8 h-10 w-40 rounded-full bg-navy/8 animate-pulse" />
    </section>
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
      <dt className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
        {label}
      </dt>
      <dd className="text-sm text-navy">{children}</dd>
    </div>
  );
}
