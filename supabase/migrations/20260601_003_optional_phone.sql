-- SkillUp 1.0 — allow null phone for admin-entered (offline) registrations.
-- Apply after 000_init.sql, 001_rls.sql, 002_offline_registration.sql.
--
-- The admin offline form lets staff add a walk-in with no phone, so
-- registrations.phone must allow NULL. Public self-registration and
-- Register-for-others still require a phone, and offline rows never hit the
-- waitlist, so waitlist.phone stays NOT NULL. Additive + safe to re-run.

set search_path = public;

alter table public.registrations alter column phone drop not null;
