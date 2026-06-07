"use client";

import {
  Autocomplete,
  EmptyState,
  type Key,
  ListBox,
  SearchField,
  useFilter,
} from "@heroui/react";

export interface TrackSelectOption {
  code: string;
  name: string;
  /** Muted suffix, e.g. "12 left", "Full", "current", "(3/20)". */
  hint?: string;
  disabled?: boolean;
}

interface Props {
  options: TrackSelectOption[];
  /** Selected track code; "" = nothing selected (or "all" when allLabel is set). */
  value: string;
  onChange: (code: string) => void;
  /** When set, prepends an empty-value option (filters use "All tracks"). */
  allLabel?: string;
  placeholder?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
}

// Sentinel id for the allLabel item - react-aria treats "" as no selection.
const ALL_VALUE = "__ALL__";

// Same trigger styling as ChurchSelect / the registration form's track picker
// so every searchable select in the app looks identical.
const TRIGGER_CLASS =
  "h-11 w-full rounded-xl border border-navy/12 bg-white px-3.5 font-sans text-sm text-navy flex items-center justify-between gap-2 data-[focused]:border-primary/40 data-[focused]:ring-2 data-[focused]:ring-primary/15";

const LISTBOX_ITEM_CLASS =
  "rounded-md data-[selected]:bg-primary/8 data-[selected]:text-primary data-[hovered]:bg-cream-100 data-[focused]:bg-cream-100 data-[disabled]:opacity-50";

/**
 * Searchable track picker for the admin dashboard. Generic options-in,
 * code-out so filter bars (with an "All tracks" choice), the change-track
 * modal (disabled rows), and form rows (capacity hints) all share it.
 */
export function TrackSelect({
  options,
  value,
  onChange,
  allLabel,
  placeholder = "Search and pick a track…",
  "aria-labelledby": ariaLabelledBy,
  "aria-label": ariaLabel,
}: Props) {
  const { contains } = useFilter({ sensitivity: "base" });
  return (
    <Autocomplete
      className="w-full"
      placeholder={allLabel ?? placeholder}
      selectionMode="single"
      value={value === "" ? (allLabel ? ALL_VALUE : null) : value}
      // aria-label / aria-labelledby live on the root; the underlying
      // react-aria Select consumes them from here and stamps the trigger's
      // accessible name (see TrackSelect in RegistrationForm).
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      onChange={(key: Key | Key[] | null) => {
        const next =
          typeof key === "string"
            ? key
            : typeof key === "number"
              ? String(key)
              : "";
        onChange(next === ALL_VALUE ? "" : next);
      }}
    >
      <Autocomplete.Trigger className={TRIGGER_CLASS}>
        <Autocomplete.Value />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField
            autoFocus
            name="track-search"
            variant="secondary"
            aria-label="Search tracks"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                placeholder="Search tracks…"
                aria-label="Search tracks"
              />
              <SearchField.ClearButton aria-label="Clear search" />
            </SearchField.Group>
          </SearchField>
          <ListBox
            renderEmptyState={() => <EmptyState>No tracks match</EmptyState>}
          >
            {allLabel && (
              <ListBox.Item
                key={ALL_VALUE}
                id={ALL_VALUE}
                textValue={allLabel}
                className={LISTBOX_ITEM_CLASS}
              >
                {allLabel}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )}
            {options.map((t) => (
              <ListBox.Item
                key={t.code}
                id={t.code}
                textValue={t.name}
                isDisabled={t.disabled}
                className={LISTBOX_ITEM_CLASS}
              >
                <span>
                  {t.name}
                  {t.hint && (
                    <span className="ml-2 text-xs text-navy/55">{t.hint}</span>
                  )}
                </span>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}
