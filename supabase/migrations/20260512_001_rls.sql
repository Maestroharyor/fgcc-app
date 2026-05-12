-- SkillUp 1.0 — Row Level Security policies
-- Apply after 000_init.sql. Only the DB-backed tables here — static content
-- (tracks, zone churches, FAQs, etc.) lives in `src/content/*.ts`.

set search_path = public;

-- ────────────────────────────────────────────────────────────────────────────
-- REGISTRATIONS — anon insert, admin read/update, superadmin delete
-- ────────────────────────────────────────────────────────────────────────────
alter table public.registrations enable row level security;

drop policy if exists "registrations_anon_insert"    on public.registrations;
drop policy if exists "registrations_admin_select"   on public.registrations;
drop policy if exists "registrations_admin_update"   on public.registrations;
drop policy if exists "registrations_superadmin_del" on public.registrations;

create policy "registrations_anon_insert"
on public.registrations for insert
to anon, authenticated
with check (true);

create policy "registrations_admin_select"
on public.registrations for select
to authenticated
using (public.has_role('admin'));

create policy "registrations_admin_update"
on public.registrations for update
to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

create policy "registrations_superadmin_del"
on public.registrations for delete
to authenticated
using (public.has_role('superadmin'));

-- ────────────────────────────────────────────────────────────────────────────
-- Count-only public read of registrations for the live capacity widget.
-- Allows anon to SELECT just enough to derive `count(*) group by track_code`.
-- We can't restrict column-level SELECT in PG RLS easily, so we publish a
-- minimal view instead and grant SELECT on the view.
-- ────────────────────────────────────────────────────────────────────────────
create or replace view public.v_track_counts as
select track_code, count(*)::int as current_count
from public.registrations
group by track_code;

grant select on public.v_track_counts to anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- BATCHES — anon insert, admin read
-- ────────────────────────────────────────────────────────────────────────────
alter table public.batches enable row level security;

drop policy if exists "batches_anon_insert"  on public.batches;
drop policy if exists "batches_admin_select" on public.batches;

create policy "batches_anon_insert"
on public.batches for insert
to anon, authenticated
with check (true);

create policy "batches_admin_select"
on public.batches for select
to authenticated
using (public.has_role('admin'));

-- ────────────────────────────────────────────────────────────────────────────
-- WAITLIST — anon insert, admin read/update
-- ────────────────────────────────────────────────────────────────────────────
alter table public.waitlist enable row level security;

drop policy if exists "waitlist_anon_insert"  on public.waitlist;
drop policy if exists "waitlist_admin_select" on public.waitlist;
drop policy if exists "waitlist_admin_update" on public.waitlist;
drop policy if exists "waitlist_admin_delete" on public.waitlist;

create policy "waitlist_anon_insert"
on public.waitlist for insert
to anon, authenticated
with check (true);

create policy "waitlist_admin_select"
on public.waitlist for select
to authenticated
using (public.has_role('admin'));

create policy "waitlist_admin_update"
on public.waitlist for update
to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

create policy "waitlist_admin_delete"
on public.waitlist for delete
to authenticated
using (public.has_role('admin'));

-- ────────────────────────────────────────────────────────────────────────────
-- FEEDBACK — anon insert, admin read
-- ────────────────────────────────────────────────────────────────────────────
alter table public.feedback enable row level security;

drop policy if exists "feedback_anon_insert"  on public.feedback;
drop policy if exists "feedback_admin_select" on public.feedback;

create policy "feedback_anon_insert"
on public.feedback for insert
to anon, authenticated
with check (true);

create policy "feedback_admin_select"
on public.feedback for select
to authenticated
using (public.has_role('admin'));

-- ────────────────────────────────────────────────────────────────────────────
-- USER_ROLES — self + superadmin read, superadmin write
-- ────────────────────────────────────────────────────────────────────────────
alter table public.user_roles enable row level security;

drop policy if exists "user_roles_self_select"     on public.user_roles;
drop policy if exists "user_roles_superadmin_all"  on public.user_roles;

create policy "user_roles_self_select"
on public.user_roles for select
to authenticated
using (user_id = auth.uid() or public.has_role('superadmin'));

create policy "user_roles_superadmin_all"
on public.user_roles for all
to authenticated
using (public.has_role('superadmin'))
with check (public.has_role('superadmin'));
