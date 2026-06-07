"use client";

import { TRACKS } from "@/content/tracks";
import { useUrlFilters } from "@/lib/hooks/use-url-filters";

/**
 * Live filter bar for /admin/certificates. Same URL-as-state pattern as
 * RegistrationsFilters: debounced text search, selects apply immediately.
 */
export function CertificatesFilters() {
  const { searchParams, apply, debouncedSearch } = useUrlFilters();

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_220px_160px_160px] gap-3">
      <input
        type="search"
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => debouncedSearch(e.target.value)}
        placeholder="Name, email, or reference"
        aria-label="Search by name, email, or reference"
        className="form-input"
      />
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
  );
}
