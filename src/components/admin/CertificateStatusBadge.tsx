import type { CertificateStatus } from "@/lib/db/types";
import { formatDate } from "@/lib/utils/date";

const STYLES: Record<CertificateStatus, string> = {
  none: "bg-navy/8 text-navy/60",
  scheduled: "bg-primary/8 text-primary",
  sent: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

const LABELS: Record<CertificateStatus, string> = {
  none: "Not queued",
  scheduled: "Scheduled",
  sent: "Sent",
  failed: "Failed",
};

/** Certificate-status pill shared by the certificates table and registrant page. */
export function CertificateStatusBadge({
  status,
  scheduledFor,
  error,
}: {
  status: CertificateStatus;
  scheduledFor?: string | null;
  error?: string | null;
}) {
  const label =
    status === "scheduled" && scheduledFor
      ? `Scheduled · ${formatDate(new Date(scheduledFor), "MMM d, h:mm a")}`
      : LABELS[status];
  return (
    <span
      title={status === "failed" ? (error ?? undefined) : undefined}
      className={`inline-flex rounded-full px-2 py-0.5 font-sans text-[10px] uppercase tracking-[0.16em] ${STYLES[status]}`}
    >
      {label}
    </span>
  );
}
