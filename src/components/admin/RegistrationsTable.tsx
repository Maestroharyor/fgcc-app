import Link from "next/link";
import type { Track } from "@/content/tracks";
import type { DBRegistration } from "@/lib/db/types";

interface Props {
  rows: DBRegistration[];
  /** Static lookup map keyed by 3-letter track code. */
  tracksByCode: Map<string, Track>;
  page: number;
  pageSize: number;
  total: number;
  buildHref: (overrides: Record<string, string | number | undefined>) => string;
}

export function RegistrationsTable({
  rows,
  tracksByCode,
  page,
  pageSize,
  total,
  buildHref,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="rounded-2xl border border-navy/8 bg-white shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-cream-100">
            <tr className="text-left font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
              <Th>Ref</Th>
              <Th>Name</Th>
              <Th>Track</Th>
              <Th>Church</Th>
              <Th>Type</Th>
              <Th>Attended</Th>
              <Th>Date</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-sm text-navy/55"
                >
                  No registrations match these filters yet.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const track = tracksByCode.get(r.track_code);
              return (
                <tr
                  key={r.id}
                  className="border-t border-navy/6 hover:bg-cream"
                >
                  <Td>
                    <span className="font-sans text-[12px] text-primary">
                      {r.reference_number}
                    </span>
                  </Td>
                  <Td>
                    <div className="font-display font-medium text-navy">
                      {r.full_name}
                    </div>
                    <div className="text-xs text-navy/55">{r.email}</div>
                  </Td>
                  <Td>{track?.name ?? "-"}</Td>
                  <Td className="text-navy/70">{r.church ?? "-"}</Td>
                  <Td>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 font-sans text-[10px] uppercase tracking-[0.16em] ${
                        r.registered_via === "self"
                          ? "bg-primary/8 text-primary"
                          : "bg-gold/12 text-gold-600"
                      }`}
                    >
                      {r.registered_via === "self" ? "Self" : "Via others"}
                    </span>
                  </Td>
                  <Td>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 font-sans text-[10px] uppercase tracking-[0.16em] ${
                        r.attended
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-navy/8 text-navy/60"
                      }`}
                    >
                      {r.attended ? "Yes" : "No"}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-navy/65">
                    {new Date(r.created_at).toLocaleDateString()}
                  </Td>
                  <Td>
                    <Link
                      href={`/admin/registrations/${r.id}`}
                      className="inline-flex items-center rounded-full bg-primary/8 px-3 py-1 font-display text-xs font-semibold text-primary hover:bg-primary/15"
                    >
                      Open
                    </Link>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3">{children}</th>;
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 align-top ${className ?? ""}`}>{children}</td>
  );
}
