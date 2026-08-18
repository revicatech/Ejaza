# Ejaza Backend (Supabase)

Postgres schema, Row Level Security, auth, storage, and booking logic for Ejaza.
The Next.js app reads/writes through `lib/supabase/*` and `lib/api/*`.

## Layout

```
supabase/
  config.toml                 local stack config (auth: email confirm + password policy)
  seed.sql                    demo owner + the 3 illustrative villas (local dev only)
  migrations/
    …_extensions_and_enums.sql   btree_gist + all enums
    …_tables.sql                 profiles, properties, bookings, property_availability
    …_functions_and_triggers.sql role helpers, new-user, anti-escalation, availability sync
    …_rls_policies.sql           RLS on every table (deny-by-default)
    …_booking_rpcs.sql           request/confirm/cancel/set_payment (the trust boundary)
    …_storage.sql                property-images bucket + owner-scoped policies
```

## First-time setup

1. **Env** — copy `.env.local.example` to `.env.local` and fill in the keys.
   - Local: `supabase start` prints the `anon` and `service_role` keys and the API URL (`http://localhost:54321`).
   - Hosted: copy them from the project's API settings.
   - `SUPABASE_SERVICE_ROLE_KEY` is **server-only** — never prefix it with `NEXT_PUBLIC_`.

2. **Run the database** — two options:

   **A. Local (needs Docker Desktop):**
   ```bash
   npx supabase start          # boots Postgres + Auth + Storage locally
   npx supabase db reset       # applies all migrations + seed.sql
   ```

   **B. Hosted project:**
   ```bash
   npx supabase link --project-ref <your-ref>
   npx supabase db push        # applies migrations
   # then run seed.sql manually if you want demo data (dev projects only)
   ```

3. **Regenerate types** after any schema change (keeps `database.types.ts` canonical):
   ```bash
   npx supabase gen types typescript --local > lib/supabase/database.types.ts
   ```

4. **Auth dashboard settings** (hosted): enable email confirmations and turn on
   **leaked-password protection** (Auth → Providers → Email).

## Verification checklist

Run these once the DB is up (the app-level typecheck/build and the pre-setup
graceful fallback are already verified).

1. **RLS is on everywhere:**
   ```sql
   select tablename, rowsecurity from pg_tables
   where schemaname = 'public'; -- all four must be true
   ```
2. **Anon sees only active listings, cannot write** — query `properties` with the
   anon key: only `status = 'active'` rows return; any insert/update is rejected.
3. **No privilege escalation** — as a signed-in guest:
   `update profiles set role = 'admin' where id = auth.uid();` → role stays `guest`.
4. **Double-booking is impossible** — fire two overlapping `request_booking` calls
   for the same property/dates concurrently: exactly one succeeds, the other
   returns `DATES_UNAVAILABLE`.
5. **Price integrity** — a booking's `total_price` always equals
   `price_per_night × nights`, regardless of any client input (totals are computed
   inside `request_booking`, never sent by the client).
6. **End-to-end** — sign up → owner registers a property (status `draft` → set
   `active`) → it appears in the homepage listings → guest requests a booking →
   owner confirms + marks paid → those nights show as `booked` in
   `property_availability`.

## Caching

- Property catalogue reads (`lib/api/properties.ts`) use `unstable_cache` tagged
  `properties` / `property:{id}`, revalidated on writes via `revalidateTag`.
- Availability (`lib/api/availability.ts`) is intentionally **uncached** so booked
  dates are always fresh.
- Rule: cache the catalogue, never cache availability or anything behind auth.
