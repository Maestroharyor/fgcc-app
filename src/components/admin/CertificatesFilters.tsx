"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { TRACKS } from "@/content/tracks";
import { useUrlFilters } from "@/lib/hooks/use-url-filters";

const FILTER_KEYS = ["q", "track", "attended", "sent"] as const;

/**
 * Live filter bar for /admin/certificates. Same URL-as-state pattern as
 * RegistrationsFilters: debounced text search, selects apply immediately.
 */
export function CertificatesFilters() {
  const { searchParams, apply, debouncedSearch } = useUrlFilters();
  // The input keeps local state so the debounced URL writes don't fight the
  // caret; it's seeded from the URL for deep links (?q=SKU-...).
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const hasFilters = FILTER_KEYS.some((k) => searchParams.get(k));

  const clearAll = () => {
    setQ("");
    apply(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])));
  };

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_160px_160px] gap-3">
        <div className="relative">
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              debouncedSearch(e.target.value);
            }}
            placeholder="Name, email, or reference"
            aria-label="Search by name, email, or reference"
            className="form-input w-full pr-9"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                apply({ q: "" });
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
        <select
          value={searchParams.get("track") ?? ""}
          onChange={(e) => apply({ track: e.target.value })}
          aria-label="Filter by track"
          className="form-input"
        >
          <option value="">All tracks</option>
          {TRACKS.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={searchParams.get("attended") ?? ""}
          onChange={(e) => apply({ attended: e.target.value })}
          aria-label="Filter by attendance"
          className="form-input"
        >
          <option value="">All attendance</option>
          <option value="yes">Attended</option>
          <option value="no">Registered only</option>
        </select>
        <select
          value={searchParams.get("sent") ?? ""}
          onChange={(e) => apply({ sent: e.target.value })}
          aria-label="Filter by certificate status"
          className="form-input"
        >
          <option value="">All statuses</option>
          <option value="yes">Sent</option>
          <option value="no">Not sent</option>
        </select>
      </div>
      {hasFilters && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 font-display text-xs font-medium text-navy/60 hover:text-coral"
          >
            <X className="h-3.5 w-3.5" aria-hidden /> Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
