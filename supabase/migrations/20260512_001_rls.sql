-- SkillUp 1.0 — Row Level Security policies
-- Apply after 000_init.sql.

set search_path = public;

-- ────────────────────────────────────────────────────────────────────────────
-- TRACKS — public read, superadmin write
-- ────────────────────────────────────────────────────────────────────────────
alter table public.tracks enable row level security;

drop policy if exists "tracks_public_select"    on public.tracks;
drop policy if exists "tracks_superadmin_write" on public.tracks;
drop policy if exists "tracks_admin_update"     on public.tracks;

create policy "tracks_public_select"
on public.tracks for select
to anon, authenticated
using (true);

create policy "tracks_admin_update"
on public.tracks for update
to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

create policy "tracks_superadmin_write"
on public.tracks for insert
to authenticated
with check (public.has_role('superadmin'));

create policy "tracks_superadmin_delete"
on public.tracks for delete
to authenticated
using (public.has_role('superadmin'));

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

-- ────────────────────────────────────────────────────────────────────────────
-- ZONE_CHURCHES — public read, superadmin write
-- ────────────────────────────────────────────────────────────────────────────
alter table public.zone_churches enable row level security;

drop policy if exists "zone_churches_public_select"    on public.zone_churches;
drop policy if exists "zone_churches_superadmin_write" on public.zone_churches;

create policy "zone_churches_public_select"
on public.zone_churches for select
to anon, authenticated
using (true);

create policy "zone_churches_superadmin_write"
on public.zone_churches for all
to authenticated
using (public.has_role('superadmin'))
with check (public.has_role('superadmin'));
