-- Ejaza backend — Phase 1c: helper functions & triggers

-- Role helpers ---------------------------------------------------------------
-- SECURITY DEFINER so they can read profiles without tripping the table's own
-- RLS (prevents infinite recursion in profiles policies).

create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.is_owner_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('owner', 'admin'), false);
$$;

-- New auth user -> profile ---------------------------------------------------
-- full_name / phone are passed as user metadata at sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    'guest'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent privilege escalation ----------------------------------------------
-- Only admins may change the role column via an authenticated session.
-- Everyone else is silently pinned to their existing role even if they
-- attempt to update it.
--
-- auth.uid() is NULL for direct/service-level Postgres access (SQL Editor,
-- migrations, seed scripts, the admin client in lib/supabase/admin.ts) — those
-- callers already bypass RLS entirely, so this check only needs to constrain
-- requests that arrive through an authenticated Supabase Auth session.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create or replace trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- updated_at maintenance -----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

-- Booking -> availability sync ----------------------------------------------
-- Keeps property_availability in step with a booking's lifecycle.
create or replace function public.sync_booking_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    -- Free previously-held nights for this booking before re-applying.
    delete from public.property_availability where booking_id = new.id;

    if new.status in ('pending', 'confirmed') then
      insert into public.property_availability (property_id, date, booking_id, status)
      select new.property_id, d::date, new.id, 'booked'
      from generate_series(new.check_in, new.check_out - 1, interval '1 day') as d
      on conflict (property_id, date)
      do update set booking_id = excluded.booking_id, status = 'booked';
    end if;
  end if;

  return new;
end;
$$;

create or replace trigger bookings_sync_availability
  after insert or update on public.bookings
  for each row execute function public.sync_booking_availability();
