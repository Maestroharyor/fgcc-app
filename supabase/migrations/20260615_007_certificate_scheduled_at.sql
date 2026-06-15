-- Certificate scheduling gains an exact send time. `certificate_scheduled_for`
-- becomes a timestamptz (the precise instant a batch should go out) instead of
-- a date, so admins can pick a date AND time. Existing date values (if any)
-- cast to midnight. The daily cron is replaced by an hourly one, so a batch
-- fires at the top of the hour at or after its scheduled time.

alter table public.registrations
  alter column certificate_scheduled_for type timestamptz
  using certificate_scheduled_for::timestamptz;

-- The (certificate_scheduled_for, certificate_status) index from migration 006
-- still applies after the type change.
