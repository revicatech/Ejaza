-- Ejaza backend — local seed data
-- Recreates the 3 illustrative villas from lib/data/properties.ts as real rows.
-- A demo owner is created in auth.users so the FK + RLS chain is exercised.
-- NOTE: seed data is for local development only.
-- ⚠️ The demo owner below is inserted directly into auth.users, which is enough
--    for FK/ownership but is missing fields GoTrue needs for LOGIN — this account
--    CANNOT sign in via the Auth API ("Database error querying schema"). To get a
--    working owner login, create one through signup or the Auth admin API and
--    reassign these villas' owner_id to it.

-- Demo owner (auth.users insert fires handle_new_user -> profiles) ------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'owner@ejaza.local',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"full_name": "مالك تجريبي", "phone": "963900000001"}',
  now(), now()
)
on conflict (id) do nothing;

-- Promote the demo user to owner (direct update; bypasses escalation guard as
-- the seed runs as a superuser/service role).
update public.profiles set role = 'owner'
where id = '00000000-0000-0000-0000-000000000001';

-- Properties -----------------------------------------------------------------
insert into public.properties
  (id, owner_id, type, name, name_ar, city, area, region, area_key, address,
   capacity, bedrooms, bathrooms, price_per_night, currency, status, images, amenities)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'villa', 'Villa Zeitoun', 'فيلا الزيتون',
    'ريف دمشق', 'يعفور، ريف دمشق', 'damascus-countryside', 'yafour', null,
    8, 3, 3, 140000, 'SYP', 'active',
    array['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80'],
    array['شرفة كبيرة']
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'villa', 'Villa Loz', 'فيلا اللوز',
    'ريف دمشق', 'بلودان', 'damascus-countryside', 'bludan', null,
    16, 7, 5, 320000, 'SYP', 'active',
    array['https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=900&q=80'],
    array['مسبح مدفأ']
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'villa', 'Villa Sindian', 'فيلا السنديان',
    'ريف دمشق', 'الزبداني', 'damascus-countryside', 'zabadani', null,
    10, 4, 3, 160000, 'SYP', 'active',
    array['https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=900&q=80'],
    array['حديقة صغيرة']
  )
on conflict (id) do nothing;
