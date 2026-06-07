-- Multi-day attendance: one timestamp per checked-in day.
-- The legacy attended/attended_at pair stays (attended = "any day attended",
-- attended_at = most recent check-in).

alter table public.registrations
  add column if not exists attendance_log jsonb not null default '[]'::jsonb;

-- Backfill the single existing check-in into the log.
update public.registrations
  set attendance_log = jsonb_build_array(to_jsonb(attended_at))
  where attended = true
    and attended_at is not null
    and attendance_log = '[]'::jsonb;
