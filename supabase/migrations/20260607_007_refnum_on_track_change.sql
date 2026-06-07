-- ────────────────────────────────────────────────────────────────────────────
-- REGENERATE REFERENCE NUMBER ON TRACK CHANGE
--   Reference numbers embed the track code (SKU-{CODE}-{NNN}), so an admin
--   track change must issue a fresh reference from the NEW track's sequence.
--   `create or replace` rebinds the existing BEFORE INSERT trigger to this
--   body too; the tg_op guard keeps INSERT behaviour identical. Sequences are
--   monotonic, so regenerated numbers can never collide with abandoned ones.
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
  -- On a track change, drop the old reference so a new one is generated below.
  if tg_op = 'UPDATE' and new.track_code is distinct from old.track_code then
    new.reference_number := null;
  end if;

  if new.reference_number is not null then
    return new;
  end if;

  v_code := upper(new.track_code);
  if v_code is null or length(v_code) = 0 then
    raise exception 'track_code is required';
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

  new.reference_number := 'SKU-' || v_code || '-' || lpad(v_seq_val::text, 3, '0');
  return new;
end;
$$;

drop trigger if exists trg_registrations_refnum_update on public.registrations;
create trigger trg_registrations_refnum_update
before update of track_code on public.registrations
for each row
when (new.track_code is distinct from old.track_code)
execute function public.generate_reference_number();
