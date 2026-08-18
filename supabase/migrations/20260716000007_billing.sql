-- Ejaza backend — Phase 4: billing / invoices
-- Design: the `bookings` row is the single source of financial truth. Its
-- money fields are immutable snapshots taken at booking time:
--   * total_price   — already computed + frozen by request_booking()
--   * commission_rate — added here, frozen via the column DEFAULT
-- The "bill" is a read-only VIEW (booking_invoices) that projects those frozen
-- values plus human-readable labels and the platform-fee / owner-payout split.
-- No separate invoices table: that would duplicate the booking and risk drift.

-- 1) Snapshot the commission rate on each booking -----------------------------
-- The column DEFAULT is the "current platform rate": every new booking freezes
-- whatever it is at insert time; changing it later (alter ... set default N)
-- never touches existing rows. request_booking() doesn't list this column, so
-- the default applies automatically — one place to change, automatic snapshot.
alter table public.bookings
  add column if not exists commission_rate numeric(4, 3) not null default 0.15
    check (commission_rate >= 0 and commission_rate <= 1);

-- 2) The bill --------------------------------------------------------------
-- A security_barrier view that reads the base tables as its owner (postgres)
-- and enforces visibility in its own WHERE — a guest sees their own bills, an
-- owner sees bills for their properties (with guest name/phone so they can
-- collect the manual payment), admins see everything. This deliberately does
-- NOT depend on the property's current status, so a guest can always retrieve
-- the bill for a past booking even if the listing was later deactivated.
-- Financial figures come only from the frozen booking columns; the name/area
-- labels reflect the current property/profile records.
create or replace view public.booking_invoices
with (security_barrier = true) as
select
  b.id                                                        as booking_id,
  b.user_id,
  g.full_name                                                 as guest_name,
  g.phone                                                     as guest_phone,
  b.property_id,
  p.name_ar                                                   as property_name,
  p.area                                                      as property_area,
  b.check_in,
  b.check_out,
  b.nights,
  p.price_per_night,
  b.total_price,
  b.commission_rate,
  round(b.total_price * b.commission_rate, 2)                 as platform_fee,
  round(b.total_price - b.total_price * b.commission_rate, 2) as owner_payout,
  b.payment_method,
  b.payment_status,
  b.status,
  b.created_at
from public.bookings b
join public.properties p on p.id = b.property_id
join public.profiles  g on g.id = b.user_id
where b.user_id = auth.uid()
   or p.owner_id = auth.uid()
   or public.is_admin();

-- The view carries no anon exposure: anon has no auth.uid(), so the WHERE
-- yields nothing even before grants. Only authenticated users may read it.
revoke all on public.booking_invoices from anon;
grant select on public.booking_invoices to authenticated;
