import { ArrowLeft, Award, Mail, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditRegistrationButton } from "@/components/admin/EditRegistrationButton";
import { REGISTERED_VIA_LABEL } from "@/components/admin/RegistrationsTable";
import { trackByCode } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import { getBatchById } from "@/lib/db/batches";
import { getRegistrationById } from "@/lib/db/registrations";
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
            {registration.attended ? "Check in for today" : "Mark attended"}
          </button>
        </form>
        {role === "superadmin" && (
          <Link
            href={`/admin/certificates?q=${registration.reference_number}`}
            className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-4 py-2 font-display text-sm font-semibold text-navy hover:bg-cream-100"
          >
            <Award className="h-4 w-4" aria-hidden /> View certificate
          </Link>
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
        {role === "superadmin" &&
          /* Delete registration disabled per request. Restore this form to re-enable.
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
          */
          null}
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
