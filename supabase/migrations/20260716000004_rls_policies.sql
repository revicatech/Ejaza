-- Ejaza backend — Phase 2: Row Level Security (deny-by-default)
-- RLS is enabled on every table. Anything not explicitly permitted is denied.
-- Writes that need server-side trust (booking totals, availability sync) go
-- through SECURITY DEFINER functions which bypass these policies by design.

alter table public.profiles              enable row level security;
alter table public.properties            enable row level security;
alter table public.bookings              enable row level security;
alter table public.property_availability enable row level security;

-- profiles -------------------------------------------------------------------
-- Inserts are done by the handle_new_user trigger (SECURITY DEFINER); no user
-- insert policy is granted. Role changes are pinned by prevent_role_escalation.
create policy "profiles: read own or admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles: update own or admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- properties -----------------------------------------------------------------
-- Public sees only active listings; owners see their own (any status); admins all.
create policy "properties: read active, own, or admin"
  on public.properties for select
  using (
    status = 'active'
    or owner_id = auth.uid()
    or public.is_admin()
  );

create policy "properties: owner insert"
  on public.properties for insert
  with check (owner_id = auth.uid() and public.is_owner_or_admin());

create policy "properties: owner update"
  on public.properties for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy "properties: owner delete"
  on public.properties for delete
  using (owner_id = auth.uid() or public.is_admin());

-- bookings -------------------------------------------------------------------
-- Reads: the booking's guest, the property's owner, or an admin.
-- Writes go exclusively through request_booking / confirm_booking /
-- set_payment_status / cancel_booking RPCs (SECURITY DEFINER). Admins keep a
-- direct write path for support/back-office.
create policy "bookings: read own, owner, or admin"
  on public.bookings for select
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.properties p
      where p.id = bookings.property_id and p.owner_id = auth.uid()
    )
  );

create policy "bookings: admin write"
  on public.bookings for all
  using (public.is_admin())
  with check (public.is_admin());

-- property_availability ------------------------------------------------------
-- Public read (calendars). 'booked' rows are trigger-managed; owners may
-- manage their own properties' rows (e.g. block dates). Admins all.
create policy "availability: public read"
  on public.property_availability for select
  using (true);

create policy "availability: owner manage own"
  on public.property_availability for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.properties p
      where p.id = property_availability.property_id and p.owner_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.properties p
      where p.id = property_availability.property_id and p.owner_id = auth.uid()
    )
  );
