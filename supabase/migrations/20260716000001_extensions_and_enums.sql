-- Ejaza backend — Phase 1a: extensions & enums
-- Extensions -----------------------------------------------------------------

-- btree_gist powers the exclusion constraint that makes overlapping bookings
-- impossible at the database level (see bookings table).
create extension if not exists btree_gist;

-- Enums ----------------------------------------------------------------------

create type user_role as enum ('guest', 'owner', 'admin');

create type property_type as enum ('villa', 'hotel', 'event');

create type property_status as enum ('draft', 'pending_review', 'active', 'inactive');

create type booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed');

create type payment_method as enum ('cash', 'bank_transfer');

create type payment_status as enum ('unpaid', 'pending', 'paid', 'refunded');

create type availability_status as enum ('available', 'booked', 'blocked');
