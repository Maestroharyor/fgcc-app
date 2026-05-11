"use client";

import { Download } from "lucide-react";
import { useState } from "react";

export function ExportMenu({ queryString }: { queryString: string }) {
  const [open, setOpen] = useState(false);
  const formats = [
    { label: "CSV", value: "csv" },
    { label: "Excel (XLSX)", value: "xlsx" },
    { label: "Printable PDF", value: "pdf" },
  ];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--color-text-navy)]/15 bg-white px-4 py-2 font-display text-sm font-semibold text-[var(--color-text-navy)] hover:bg-[var(--color-neutral-cream-100)]"
      >
        <Download className="h-4 w-4" aria-hidden /> Export
      </button>
      {open && (
        <ul className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-[var(--color-text-navy)]/8 bg-white p-1 shadow-[var(--shadow-lift)]">
          {formats.map((f) => (
            <li key={f.value}>
              <a
                href={`/api/admin/export?format=${f.value}&${queryString}`}
                download
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm hover:bg-[var(--color-neutral-cream-100)]"
              >
                {f.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
