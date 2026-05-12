import { ArrowRight, CheckCircle2, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { trackByCode } from "@/content/tracks";
import { getRegistrationByReference } from "@/lib/db/registrations";
import { qrDataUrl } from "@/lib/qr/generate";
import { parseReference } from "@/lib/ref-code/generate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "You're confirmed · SkillUp 1.0",
};

interface PageProps {
  searchParams: Promise<{ ref?: string; batch?: string }>;
}

export default async function SuccessPage({ searchParams }: PageProps) {
  const { ref, batch } = await searchParams;
  if (batch) {
    return (
      <Suspense fallback={<SuccessSkeleton />}>
        <BatchSuccess batchId={batch} />
      </Suspense>
    );
  }
  if (!ref || !parseReference(ref)) {
    return <Fallback />;
  }
  return (
    <Suspense fallback={<SuccessSkeleton />}>
      <IndividualSuccess refNumber={ref} />
    </Suspense>
  );
}

async function IndividualSuccess({ refNumber }: { refNumber: string }) {
  const registration = await getRegistrationByReference(refNumber);
  if (!registration) {
    return <Fallback />;
  }
  const track = trackByCode(registration.track_code);
  const qr = await qrDataUrl(registration.reference_number);

  return (
    <div className="px-6 sm:px-10 py-12 sm:py-20">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 sm:p-12 shadow-lift border border-navy/8">
        <div className="flex items-center gap-3 font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
          <CheckCircle2 className="h-4 w-4" aria-hidden /> Confirmed
        </div>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-navy">
          You’re in, {firstName(registration.full_name)}.
        </h1>
        <p className="mt-2 text-navy/70">
          Your spot is locked for SkillUp 1.0 · June 12 – 14, 2026 at Cement
          Missionary HQ, Lagos. Screenshot this page - your QR code is your
          fast-pass at the door.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="rounded-2xl bg-cream-100 p-5">
              <div className="font-sans text-[10px] uppercase tracking-[0.2em] text-navy/55">
                Reference number
              </div>
              <div className="mt-1 font-sans text-2xl font-bold tracking-[0.04em] text-navy">
                {registration.reference_number}
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-3 text-sm">
              <Row label="Track" value={track?.name ?? "-"} />
              <Row label="Facilitator" value={track?.facilitator ?? "TBA"} />
              <Row label="Dates" value="June 12 – 14, 2026" />
              <Row label="Venue" value="Cement Missionary HQ, Lagos" />
            </dl>
          </div>

          {/* biome-ignore lint/performance/noImgElement: data URL, no remote optimisation */}
          <img
            src={qr}
            alt={`QR code for ${registration.reference_number}`}
            width={180}
            height={180}
            className="rounded-2xl border border-navy/8 self-start"
          />
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          {track?.whatsappUrl && (
            <a
              href={track.whatsappUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-display font-semibold text-white shadow-card hover:bg-primary-700"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Join the WhatsApp group
            </a>
          )}
          <a
            href="/skillup#tracks"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-navy/15 px-6 py-3 font-display font-semibold text-navy hover:bg-cream-100"
          >
            Back to programme
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </div>

        <p className="mt-6 text-xs text-navy/55">
          A confirmation email with your QR is on the way to{" "}
          <strong>{registration.email}</strong>.
        </p>
      </div>
    </div>
  );
}

async function BatchSuccess({ batchId }: { batchId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("batches")
    .select("submitter_name, total_registrants")
    .eq("id", batchId)
    .maybeSingle();
  return (
    <div className="px-6 sm:px-10 py-12 sm:py-20">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 sm:p-12 shadow-lift border border-navy/8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-4 py-1.5 font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Submitted
        </div>
        <h1 className="mt-4 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-navy">
          Thank you
          {data?.submitter_name ? `, ${firstName(data.submitter_name)}` : ""}.
        </h1>
        <p className="mt-3 text-navy/70">
          You registered {data?.total_registrants ?? "several"}{" "}
          {data?.total_registrants === 1 ? "person" : "people"} for SkillUp 1.0.
          A summary email with every reference code is on the way to your inbox
          now - share each code with the person it belongs to.
        </p>
        <a
          href="/skillup#tracks"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-display font-semibold text-white hover:bg-primary-700"
        >
          Back to programme
          <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </div>
  );
}

function SuccessSkeleton() {
  return (
    <div className="px-6 sm:px-10 py-12 sm:py-20">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 sm:p-12 shadow-lift border border-navy/8 animate-pulse">
        <div className="h-3 w-24 rounded bg-navy/10" />
        <div className="mt-4 h-9 w-2/3 rounded bg-navy/10" />
        <div className="mt-3 h-4 w-full rounded bg-navy/8" />
        <div className="mt-1 h-4 w-3/4 rounded bg-navy/8" />
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6 items-center">
          <div className="space-y-3">
            <div className="h-20 rounded-2xl bg-cream-100" />
            <div className="h-32 rounded-2xl bg-navy/4" />
          </div>
          <div className="h-44 w-44 rounded-2xl bg-navy/8" />
        </div>
      </div>
    </div>
  );
}

function Fallback() {
  return (
    <div className="px-6 sm:px-10 py-20 text-center">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-10 shadow-card border border-navy/8">
        <h1 className="font-display text-2xl font-semibold text-navy">
          Couldn’t find that reference.
        </h1>
        <p className="mt-2 text-sm text-navy/65">
          Try clicking the link in your confirmation email again, or register
          fresh.
        </p>
        <Link
          href="/skillup/register"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 font-display font-semibold text-white hover:bg-primary-700"
        >
          Go to registration
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-navy/6 last:border-b-0 pb-2 last:pb-0">
      <dt className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
        {label}
      </dt>
      <dd className="text-sm font-medium text-navy text-right">{value}</dd>
    </div>
  );
}

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? full;
}
