-- SkillUp 1.0 — certificate signatories (chairman + convener).
-- Apply after 000_init.sql and 001_rls.sql.
--
-- Stores the two signature blocks printed on certificates: editable name and
-- title, plus the Storage path of the uploaded signature PNG. Idempotent +
-- safe to re-run.

set search_path = public;

-- ────────────────────────────────────────────────────────────────────────────
-- TABLE
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.certificate_signatories (
  slot        text primary key check (slot in ('chairman', 'convener')),
  name        text not null default '',
  title       text not null,
  image_path  text,
  updated_at  timestamptz not null default now()
);

insert into public.certificate_signatories (slot, name, title)
values
  ('chairman', '', 'Chairman, Planning Committee'),
  ('convener', '', 'Programme Convener')
on conflict (slot) do nothing;

-- ────────────────────────────────────────────────────────────────────────────
-- RLS — admin read, superadmin write
-- ────────────────────────────────────────────────────────────────────────────
alter table public.certificate_signatories enable row level security;

drop policy if exists "cert_signatories_admin_select"  on public.certificate_signatories;
drop policy if exists "cert_signatories_superadmin_all" on public.certificate_signatories;

create policy "cert_signatories_admin_select"
on public.certificate_signatories for select
to authenticated
using (public.has_role('admin'));

create policy "cert_signatories_superadmin_all"
on public.certificate_signatories for all
to authenticated
using (public.has_role('superadmin'))
with check (public.has_role('superadmin'));

-- ────────────────────────────────────────────────────────────────────────────
-- STORAGE — private bucket for signature PNGs. All reads/writes go through
-- the server with the secret key, so no storage.objects policies are needed.
-- ────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', false)
on conflict (id) do nothing;
