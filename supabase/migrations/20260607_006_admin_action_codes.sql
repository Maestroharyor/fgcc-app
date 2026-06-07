-- ────────────────────────────────────────────────────────────────────────────
-- ADMIN ACTION CODES
--   Short-lived email confirmation codes for sensitive admin actions
--   (track change, registration delete). Codes are stored as sha256 hashes,
--   expire after 10 minutes, allow 5 attempts, and are single-use.
--
--   RLS is enabled with NO policies on purpose: only the service-role client
--   (src/lib/supabase/admin.ts) can read or write rows. Route handlers gate
--   with requireRole() before touching this table.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.admin_action_codes (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  admin_user_id   uuid not null,
  action          text not null check (action in ('track_change','delete_registration')),
  payload         jsonb not null default '{}'::jsonb,
  code_hash       text not null,
  attempts        int  not null default 0,
  expires_at      timestamptz not null,
  consumed_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists admin_action_codes_lookup_idx
  on public.admin_action_codes (registration_id, admin_user_id, action);

alter table public.admin_action_codes enable row level security;
