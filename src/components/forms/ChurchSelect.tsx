"use client";

import {
  Autocomplete,
  EmptyState,
  type Key,
  ListBox,
  SearchField,
  useFilter,
} from "@heroui/react";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Header } from "react-aria-components";
import {
  CHURCH_ZONES,
  isCataloguedChurch,
  OTHER_CHURCH_VALUE,
} from "@/content/churches";

interface Props {
  value: string | undefined;
  onChange: (value: string) => void;
  /** Optional id of an error message element to associate via aria-describedby. */
  invalidId?: string;
  /** Whether the field is in an invalid state — flows to aria-invalid. */
  hasError?: boolean;
  /** Required marker on the parent label is the user-visible "*"; this drives aria-required. */
  required?: boolean;
  /** Field-component contract: parent's label id, forwarded to the trigger / input. */
  "aria-labelledby"?: string;
  /** Fallback label text for scanners that don't follow aria-labelledby. */
  "aria-label"?: string;
}

// Same trigger styling as the registration form's TrackSelect so the two
// pickers look identical.
const TRIGGER_CLASS =
  "h-11 w-full rounded-xl border border-navy/12 bg-white px-3.5 font-sans text-sm text-navy flex items-center justify-between gap-2 data-[focused]:border-primary/40 data-[focused]:ring-2 data-[focused]:ring-primary/15";

const LISTBOX_ITEM_CLASS =
  "rounded-md data-[selected]:bg-primary/8 data-[selected]:text-primary data-[hovered]:bg-cream-100 data-[focused]:bg-cream-100 data-[disabled]:opacity-50";

const SECTION_HEADER_CLASS =
  "px-2 pt-2 pb-1 font-sans text-[10px] uppercase tracking-[0.22em] text-navy/55";

/**
 * Searchable, zone-grouped church / organisation picker with an "Other"
 * escape hatch for attendees outside the district.
 *
 * The component handles its own "other" mode (free-text input) but exposes a
 * single controlled `value: string` to the parent. From the form's point of
 * view it's just another field that emits a string.
 */
export function ChurchSelect({
  value,
  onChange,
  invalidId,
  hasError,
  required,
  "aria-labelledby": ariaLabelledBy,
  "aria-label": ariaLabel,
}: Props) {
  const { contains } = useFilter({ sensitivity: "base" });

  // "Other" mode is entered when the user picks the Other item, OR when the
  // initial value comes in as a non-catalogued string (e.g. someone editing a
  // previous submission). Empty value = picker mode by default.
  const [isOther, setIsOther] = useState<boolean>(
    Boolean(value) && !isCataloguedChurch(value),
  );

  if (isOther) {
    return (
      <div className="flex flex-col gap-2">
        <input
          className="form-input"
          placeholder="Type your church or organisation"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="organization"
          aria-required={required}
          aria-invalid={hasError}
          aria-describedby={invalidId}
          aria-labelledby={ariaLabelledBy}
          aria-label={ariaLabel}
          maxLength={120}
        />
        <button
          type="button"
          onClick={() => {
            onChange("");
            setIsOther(false);
          }}
          className="inline-flex w-fit items-center gap-1 font-display text-xs font-medium text-primary hover:text-primary-700"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden /> Pick from the list
          instead
        </button>
      </div>
    );
  }

  return (
    <Autocomplete
      className="w-full"
      placeholder="Search and pick a church…"
      selectionMode="single"
      value={value ?? null}
      // aria-label / aria-labelledby live on the root — see TrackSelect in
      // RegistrationForm for the full reason.
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      onChange={(key: Key | Key[] | null) => {
        const next =
          typeof key === "string"
            ? key
            : typeof key === "number"
              ? String(key)
              : "";
        if (next === OTHER_CHURCH_VALUE) {
          onChange("");
          setIsOther(true);
          return;
        }
        onChange(next);
      }}
    >
      <Autocomplete.Trigger
        className={TRIGGER_CLASS}
        aria-required={required}
        aria-invalid={hasError}
        aria-describedby={invalidId}
      >
        <Autocomplete.Value />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField
            autoFocus
            name="church-search"
            variant="secondary"
            aria-label="Search churches"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                placeholder="Search churches…"
                aria-label="Search churches"
              />
              <SearchField.ClearButton aria-label="Clear search" />
            </SearchField.Group>
          </SearchField>
          <ListBox
            renderEmptyState={() => (
              <EmptyState>No churches match - try "Other".</EmptyState>
            )}
          >
            {CHURCH_ZONES.map((zone) => (
              <ListBox.Section key={zone.id}>
                <Header className={SECTION_HEADER_CLASS}>{zone.label}</Header>
                {zone.churches.map((name) => (
                  <ListBox.Item
                    key={name}
                    id={name}
                    textValue={name}
                    className={LISTBOX_ITEM_CLASS}
                  >
                    {name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox.Section>
            ))}
            <ListBox.Item
              key={OTHER_CHURCH_VALUE}
              id={OTHER_CHURCH_VALUE}
              textValue="Other / Not listed"
              className={LISTBOX_ITEM_CLASS}
            >
              <span className="italic text-navy/70">Other / Not listed</span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}
