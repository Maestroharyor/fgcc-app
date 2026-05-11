-- SkillUp 1.0 — initial schema
-- Run order: 000 → 001 (rls) → 002 (seed)
-- Safe to re-run on a fresh project. Tables guarded with IF NOT EXISTS where possible.

set search_path = public;

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ────────────────────────────────────────────────────────────────────────────
-- TRACKS
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.tracks (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  name              text not null,
  category          text not null check (category in ('digital','creative','vocational')),
  description       text,
  facilitator_name  text,
  facilitator_bio   text,
  facilitator_image text,
  glyph_key         text,
  capacity          integer not null default 20 check (capacity > 0),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- BATCHES — one row per Register-for-Others submission
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.batches (
  id                uuid primary key default gen_random_uuid(),
  submitter_name    text not null,
  submitter_email   text not null,
  submitter_phone   text not null,
  relationship      text not null check (relationship in ('pastor','parent','friend','church_worker','other')),
  church            text,
  total_registrants integer not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists batches_submitter_email_idx on public.batches (submitter_email);

-- ────────────────────────────────────────────────────────────────────────────
-- REGISTRATIONS
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.registrations (
  id                       uuid primary key default gen_random_uuid(),
  reference_number         text unique,
  full_name                text not null,
  email                    citext not null,
  phone                    text not null,
  gender                   text not null check (gender in ('male','female','other')),
  age_group                text not null check (age_group in ('under_18','18_25','26_35','36_plus')),
  church                   text,
  track_id                 uuid not null references public.tracks(id) on delete restrict,
  registered_via           text not null default 'self' check (registered_via in ('self','others')),
  batch_id                 uuid references public.batches(id) on delete set null,
  how_heard                text,
  attended                 boolean not null default false,
  attended_at              timestamptz,
  reminder_3day_sent_at    timestamptz,
  reminder_1day_sent_at    timestamptz,
  feedback_request_sent_at timestamptz,
  certificate_sent_at      timestamptz,
  created_at               timestamptz not null default now(),
  unique (email)
);

create index if not exists registrations_track_idx     on public.registrations (track_id);
create index if not exists registrations_created_idx   on public.registrations (created_at desc);
create index if not exists registrations_attended_idx  on public.registrations (attended) where attended = true;
create index if not exists registrations_batch_idx     on public.registrations (batch_id);

-- ────────────────────────────────────────────────────────────────────────────
-- WAITLIST
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  track_id    uuid not null references public.tracks(id) on delete cascade,
  full_name   text not null,
  email       citext not null,
  phone       text not null,
  gender      text,
  age_group   text,
  church      text,
  position    integer not null,
  notified_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (track_id, email)
);

create index if not exists waitlist_track_position_idx on public.waitlist (track_id, position);

-- ────────────────────────────────────────────────────────────────────────────
-- FEEDBACK
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.feedback (
  id                  uuid primary key default gen_random_uuid(),
  registration_id     uuid not null references public.registrations(id) on delete cascade,
  overall_rating      integer not null check (overall_rating between 1 and 5),
  track_rating        integer not null check (track_rating between 1 and 5),
  facilitator_rating  integer not null check (facilitator_rating between 1 and 5),
  enjoyed_most        text,
  improvements        text,
  attend_next         text check (attend_next in ('yes','no','maybe')),
  testimony           text,
  share_as_testimonial boolean not null default false,
  created_at          timestamptz not null default now()
);

create index if not exists feedback_registration_idx on public.feedback (registration_id);

-- ────────────────────────────────────────────────────────────────────────────
-- USER_ROLES
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.user_roles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('admin','superadmin')),
  assigned_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- ZONE_CHURCHES — seedable list for the Register-for-Others dropdown
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.zone_churches (
  id   serial primary key,
  name text not null unique,
  area text
);

-- ────────────────────────────────────────────────────────────────────────────
-- REFERENCE NUMBER TRIGGER
-- Generates SKU-{TRACK_CODE}-{NNN} from per-track sequences.
-- Sequences are created lazily inside the function — works even if a track is
-- added later via admin UI.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.generate_reference_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_seq_name text;
  v_seq_val bigint;
begin
  if new.reference_number is not null then
    return new;
  end if;

  select code into v_code from public.tracks where id = new.track_id;
  if v_code is null then
    raise exception 'Track not found for id %', new.track_id;
  end if;

  v_seq_name := 'track_seq_' || lower(v_code);

  -- Create the sequence on demand if it doesn't exist yet.
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'S' and n.nspname = 'public' and c.relname = v_seq_name
  ) then
    execute format('create sequence if not exists public.%I start with 1', v_seq_name);
  end if;

  execute format('select nextval(%L)', 'public.' || v_seq_name) into v_seq_val;

  new.reference_number := 'SKU-' || upper(v_code) || '-' || lpad(v_seq_val::text, 3, '0');
  return new;
end;
$$;

drop trigger if exists trg_registrations_refnum on public.registrations;
create trigger trg_registrations_refnum
before insert on public.registrations
for each row execute function public.generate_reference_number();

-- ────────────────────────────────────────────────────────────────────────────
-- CAPACITY VIEW — public-readable, used for live stats and capacity badges.
-- ────────────────────────────────────────────────────────────────────────────
create or replace view public.v_track_capacity as
select
  t.id,
  t.code,
  t.name,
  t.category,
  t.facilitator_name,
  t.glyph_key,
  t.capacity,
  t.is_active,
  coalesce(r.cnt, 0)::int                                       as current_count,
  greatest(t.capacity - coalesce(r.cnt, 0), 0)::int             as remaining,
  case when coalesce(r.cnt, 0) >= t.capacity then true else false end as is_full
from public.tracks t
left join (
  select track_id, count(*)::int as cnt
  from public.registrations
  group by track_id
) r on r.track_id = t.id;

-- Allow public + authenticated to read the view.
grant select on public.v_track_capacity to anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- HELPER FUNCTION — role check used by RLS policies (defined in 001).
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and (
        role = required_role
        or (required_role = 'admin' and role in ('admin','superadmin'))
      )
  );
$$;

grant execute on function public.has_role(text) to anon, authenticated;
