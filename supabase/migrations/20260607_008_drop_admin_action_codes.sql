-- ────────────────────────────────────────────────────────────────────────────
-- DROP ADMIN ACTION CODES
--   The email-code confirmation flow for track changes / deletes was replaced
--   by plain confirmation modals before launch, so the table created in 006
--   is unused. Dropped here (rather than deleting 006) because 006 already
--   ran in production.
-- ────────────────────────────────────────────────────────────────────────────
drop table if exists public.admin_action_codes;
