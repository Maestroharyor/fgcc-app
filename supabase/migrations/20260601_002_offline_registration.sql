-- SkillUp 1.0 — add the "offline" registration channel.
-- Apply after 000_init.sql and 001_rls.sql.
--
-- Admins register walk-ins / offline sign-ups from the dashboard. Those rows
-- carry registered_via = 'offline', which the original CHECK constraint in
-- 000_init.sql did not permit. Widen it. Idempotent + safe to re-run.

set search_path = public;

alter table public.registrations
  drop constraint if exists registrations_registered_via_check;

alter table public.registrations
  add constraint registrations_registered_via_check
  check (registered_via in ('self', 'others', 'offline'));
