import type { Metadata } from "next";
import { Suspense } from "react";
import { ExportMenu } from "@/components/admin/ExportMenu";
import { RegistrationsFilters } from "@/components/admin/RegistrationsFilters";
import { RegistrationsTable } from "@/components/admin/RegistrationsTable";
import { WhatsAppReminderBulkButton } from "@/components/admin/WhatsAppReminderBulkButton";
import { TRACKS_BY_CODE } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import { listRegistrations } from "@/lib/db/registrations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registrations · SkillUp Admin",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    track?: string;
    type?: "self" | "others" | "offline";
    attended?: "yes" | "no";
  }>;
}

export default async function RegistrationsPage({ searchParams }: PageProps) {
  // Auth gate must resolve before render - the redirect (if any) needs to fire
  // before any HTML streams to the client.
  await requireRole("admin");
  const params = await searchParams;

  const queryString = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
    ) as Record<string, string>,
  ).toString();

  return (
    <div className="px-6 md:px-10 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
            Records
          </span>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
            Registrations
          </h1>
          <p className="text-sm text-navy/65">Search and filter to slice.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <WhatsAppReminderBulkButton />
          <ExportMenu queryString={queryString} />
        </div>
      </div>

      {/* Live filters drive the URL search params (no Apply, soft navigation).
          Suspense is required because the component reads useSearchParams. */}
      <Suspense
        fallback={
          <div className="mt-6 h-11 rounded-full bg-navy/5 animate-pulse" />
        }
      >
        <RegistrationsFilters />
      </Suspense>

      {/* Table streams in once the DB query resolves. */}
      <div className="mt-6">
        <Suspense fallback={<TableSkeleton />}>
          <RegistrationsTableAsync params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function RegistrationsTableAsync({
  params,
}: {
  params: {
    q?: string;
    page?: string;
    track?: string;
    type?: "self" | "others" | "offline";
    attended?: "yes" | "no";
  };
}) {
  const page = Number(params.page ?? "1") || 1;
  const { rows, total, pageSize } = await listRegistrations({
    query: params.q,
    trackCode: params.track,
    type: params.type,
    attended:
      params.attended === "yes"
        ? true
        : params.attended === "no"
          ? false
          : undefined,
    page,
    pageSize: 50,
  });

  const buildHref = (
    overrides: Record<string, string | number | undefined>,
  ) => {
    const sp = new URLSearchParams();
    const merge = { ...params, ...overrides };
    for (const [k, v] of Object.entries(merge)) {
      if (v !== undefined && v !== "" && v !== null) sp.set(k, String(v));
    }
    return `/admin/registrations?${sp.toString()}`;
  };

  return (
    <>
      <p className="mb-3 text-sm text-navy/65">
        {total.toLocaleString()} total
      </p>
      <RegistrationsTable
        rows={rows}
        tracksByCode={new Map(Object.entries(TRACKS_BY_CODE))}
        page={page}
        pageSize={pageSize}
        total={total}
        buildHref={buildHref}
      />
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-2xl border border-navy/8 bg-white shadow-card overflow-hidden">
      <div className="space-y-px">
        {["a", "b", "c", "d", "e", "f", "g", "h"].map((row) => (
          <div
            key={`row-${row}`}
            className="h-12 bg-white animate-pulse border-b border-navy/6"
          />
        ))}
      </div>
    </div>
  );
}
