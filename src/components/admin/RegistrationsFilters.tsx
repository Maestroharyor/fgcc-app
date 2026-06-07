"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { TrackSelect } from "@/components/forms/TrackSelect";
import { TRACKS } from "@/content/tracks";
import { useUrlFilters } from "@/lib/hooks/use-url-filters";

const FILTER_KEYS = ["q", "track", "type", "attended"] as const;

/**
 * Live filter bar for /admin/registrations. The URL search params ARE the state
 * — there's no local filter state. The text input is debounced; the selects
 * apply immediately. Both rewrite the query string with router.replace (soft
 * navigation, no full reload), and the server page re-queries on the new params.
 */
export function RegistrationsFilters() {
  const { searchParams, apply, debouncedSearch } = useUrlFilters();
  // The input keeps local state so the debounced URL writes don't fight the
  // caret; it's seeded from the URL for deep links.
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const hasFilters = FILTER_KEYS.some((k) => searchParams.get(k));

  const clearAll = () => {
    setQ("");
    apply(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])));
  };

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_180px_160px] gap-3">
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
        <TrackSelect
          aria-label="Filter by track"
          allLabel="All tracks"
          value={searchParams.get("track") ?? ""}
          onChange={(code) => apply({ track: code })}
          options={TRACKS.map((t) => ({ code: t.code, name: t.name }))}
        />
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
