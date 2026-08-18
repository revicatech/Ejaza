-- Ejaza backend — Phase 1b: tables
-- Credentials (email/password/sessions) live in auth.users, owned by Supabase
-- Auth. public.profiles is the 1:1 app-level user record.

-- profiles -------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null,
  phone      text,
  role       user_role not null default 'guest',
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'App-level user record, 1:1 with auth.users. No credentials stored here.';

-- properties -----------------------------------------------------------------
create table public.properties (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles (id) on delete cascade,
  type            property_type not null default 'villa',
  name            text not null,
  name_ar         text not null,
  city            text not null,
  area            text not null,
  -- region + area_key preserve the existing frontend filter behaviour
  -- (components/sections/Listings.tsx filters by areaKey).
  region          text,
  area_key        text,
  address         text,
  capacity        int not null default 1 check (capacity > 0),
  bedrooms        int not null default 0 check (bedrooms >= 0),
  bathrooms       int not null default 0 check (bathrooms >= 0),
  price_per_night numeric(12, 2) not null check (price_per_night >= 0),
  currency        text not null default 'SYP',
  status          property_status not null default 'draft',
  images          text[] not null default '{}',
  amenities       text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index properties_status_idx   on public.properties (status);
create index properties_city_idx     on public.properties (city);
create index properties_area_key_idx on public.properties (area_key);
create index properties_owner_id_idx on public.properties (owner_id);

-- bookings -------------------------------------------------------------------
-- nights and total_price are computed server-side by request_booking(); never
-- trust client-supplied totals.
create table public.bookings (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  property_id    uuid not null references public.properties (id) on delete cascade,
  check_in       date not null,
  check_out      date not null,
  nights         int not null check (nights > 0),
  total_price    numeric(12, 2) not null check (total_price >= 0),
  status         booking_status not null default 'pending',
  payment_method payment_method not null default 'cash',
  payment_status payment_status not null default 'unpaid',
  created_at     timestamptz not null default now(),

  constraint bookings_dates_valid check (check_out > check_in),

  -- Anti double-booking: two active (pending/confirmed) bookings for the same
  -- property can never overlap. daterange is half-open [check_in, check_out).
  constraint bookings_no_overlap exclude using gist (
    property_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status in ('pending', 'confirmed'))
);

create index bookings_user_id_idx     on public.bookings (user_id);
create index bookings_property_id_idx on public.bookings (property_id);
create index bookings_status_idx      on public.bookings (status);

-- property_availability ------------------------------------------------------
-- Per-night calendar. 'booked' rows are maintained by trigger from bookings;
-- 'blocked' rows are owner-set unavailable dates.
create table public.property_availability (
  property_id uuid not null references public.properties (id) on delete cascade,
  date        date not null,
  booking_id  uuid references public.bookings (id) on delete set null,
  status      availability_status not null default 'available',
  primary key (property_id, date)
);

create index property_availability_booking_id_idx on public.property_availability (booking_id);
