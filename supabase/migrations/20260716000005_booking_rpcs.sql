-- Ejaza backend — Phase 2b: booking RPCs (the trust boundary)
-- All booking writes go through these SECURITY DEFINER functions so that:
--   * totals are computed server-side from the property's price (never trusted
--     from the client),
--   * status/payment transitions are authorised explicitly, and
--   * overlaps are rejected atomically by the exclusion constraint.

-- request_booking ------------------------------------------------------------
create or replace function public.request_booking(
  p_property_id    uuid,
  p_check_in       date,
  p_check_out      date,
  p_payment_method payment_method default 'cash'
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_property public.properties;
  v_nights   int;
  v_total    numeric(12, 2);
  v_booking  public.bookings;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if p_check_out <= p_check_in then
    raise exception 'INVALID_DATE_RANGE' using errcode = '22007';
  end if;

  select * into v_property from public.properties where id = p_property_id;
  if not found then
    raise exception 'PROPERTY_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_property.status <> 'active' then
    raise exception 'PROPERTY_NOT_BOOKABLE' using errcode = 'P0001';
  end if;

  -- Server-side price computation. The client sends dates only.
  v_nights := p_check_out - p_check_in;
  v_total  := v_nights * v_property.price_per_night;

  begin
    insert into public.bookings (
      user_id, property_id, check_in, check_out, nights, total_price,
      status, payment_method, payment_status
    )
    values (
      v_uid, p_property_id, p_check_in, p_check_out, v_nights, v_total,
      'pending', p_payment_method, 'unpaid'
    )
    returning * into v_booking;
  exception
    when exclusion_violation then
      raise exception 'DATES_UNAVAILABLE' using errcode = 'P0003';
  end;

  return v_booking;
end;
$$;

-- confirm_booking ------------------------------------------------------------
-- Owner of the property or an admin marks a booking confirmed.
create or replace function public.confirm_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_booking public.bookings;
  v_owner   uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select p.owner_id into v_owner
  from public.bookings b join public.properties p on p.id = b.property_id
  where b.id = p_booking_id;

  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_owner <> v_uid and not public.is_admin() then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;

  update public.bookings set status = 'confirmed'
  where id = p_booking_id returning * into v_booking;

  return v_booking;
end;
$$;

-- set_payment_status ---------------------------------------------------------
-- Owner/admin records manual (cash / bank transfer) payment state.
create or replace function public.set_payment_status(
  p_booking_id uuid,
  p_status     payment_status
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_booking public.bookings;
  v_owner   uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select p.owner_id into v_owner
  from public.bookings b join public.properties p on p.id = b.property_id
  where b.id = p_booking_id;

  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_owner <> v_uid and not public.is_admin() then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;

  update public.bookings set payment_status = p_status
  where id = p_booking_id returning * into v_booking;

  return v_booking;
end;
$$;

-- cancel_booking -------------------------------------------------------------
-- The booking's guest (while pending), the property owner, or an admin may
-- cancel. Cancelling frees the held nights via the availability sync trigger.
create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_booking public.bookings;
  v_owner   uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0002';
  end if;

  select owner_id into v_owner from public.properties where id = v_booking.property_id;

  -- Guests may cancel only their own still-pending booking.
  if v_booking.user_id = v_uid then
    if v_booking.status <> 'pending' then
      raise exception 'CANNOT_CANCEL' using errcode = 'P0001';
    end if;
  elsif v_owner <> v_uid and not public.is_admin() then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;

  update public.bookings set status = 'cancelled'
  where id = p_booking_id returning * into v_booking;

  return v_booking;
end;
$$;

-- Expose only to authenticated users (not the anon role).
revoke execute on function public.request_booking(uuid, date, date, payment_method)   from anon, public;
revoke execute on function public.confirm_booking(uuid)                                from anon, public;
revoke execute on function public.set_payment_status(uuid, payment_status)             from anon, public;
revoke execute on function public.cancel_booking(uuid)                                 from anon, public;

grant execute on function public.request_booking(uuid, date, date, payment_method)     to authenticated;
grant execute on function public.confirm_booking(uuid)                                 to authenticated;
grant execute on function public.set_payment_status(uuid, payment_status)              to authenticated;
grant execute on function public.cancel_booking(uuid)                                  to authenticated;
