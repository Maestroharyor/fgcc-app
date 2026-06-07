"use client";

import { TRACKS } from "@/content/tracks";
import { useUrlFilters } from "@/lib/hooks/use-url-filters";

/**
 * Live filter bar for /admin/registrations. The URL search params ARE the state
 * — there's no local filter state. The text input is debounced; the selects
 * apply immediately. Both rewrite the query string with router.replace (soft
 * navigation, no full reload), and the server page re-queries on the new params.
 */
export function RegistrationsFilters() {
  const { searchParams, apply, debouncedSearch } = useUrlFilters();

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_220px_180px_160px] gap-3">
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
        value={searchParams.get("type") ?? ""}
        onChange={(e) => apply({ type: e.target.value })}
        aria-label="Filter by registration type"
        className="form-input"
      >
        <option value="">All types</option>
        <option value="self">Self-registered</option>
        <option value="others">Via someone else</option>
        <option value="offline">Offline (admin)</option>
      </select>
      <select
        value={searchParams.get("attended") ?? ""}
        onChange={(e) => apply({ attended: e.target.value })}
        aria-label="Filter by check-in status"
        className="form-input"
      >
        <option value="">All check-ins</option>
        <option value="yes">Checked in</option>
        <option value="no">Not checked in</option>
      </select>
    </div>
  );
}
