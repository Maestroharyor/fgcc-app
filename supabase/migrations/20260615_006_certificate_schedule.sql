-- Scheduled certificate sending.
-- Certificates are batched across days to stay under Resend's free-plan cap
-- (100 emails/day). Each registrant carries a status + the Lagos day its
-- certificate is slated to send, plus the last error so failures can be retried.
--
-- certificate_status:
--   'none'      not queued
--   'scheduled' assigned a send day, not yet sent
--   'sent'      Resend accepted the email (certificate_sent_at stamped)
--   'failed'    last send attempt errored (certificate_error holds why)

alter table public.registrations
  add column if not exists certificate_status text not null default 'none'
    check (certificate_status in ('none', 'scheduled', 'sent', 'failed')),
  add column if not exists certificate_scheduled_for date,
  add column if not exists certificate_error text,
  add column if not exists certificate_attempts integer not null default 0;

-- Backfill rows that were already sent under the legacy single-stamp flow.
update public.registrations
  set certificate_status = 'sent'
  where certificate_sent_at is not null
    and certificate_status = 'none';

-- The daily send query filters by (scheduled_for, status).
create index if not exists registrations_cert_sched_idx
  on public.registrations (certificate_scheduled_for, certificate_status);
