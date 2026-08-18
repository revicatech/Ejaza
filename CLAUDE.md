# Ejaza (إجازة)

Arabic (RTL) short-term rental marketplace for Syrian villas/chalets/event venues. Guests browse and book; owners list properties and get paid manually (cash / bank transfer) at 15% commission.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**, strict mode, path alias `@/*`.
- Styling: plain **CSS Modules**, no Tailwind. Fonts via `next/font/google` (Cairo, Markazi Text).
- **Supabase** (Postgres + Auth + Storage) as the backend.
- No state/data library (no Redux/Zustand/React Query) — Server Components + Server Actions.
- `app/layout.tsx` hardcodes `lang="ar" dir="rtl"`. Content is Arabic-only; no i18n framework.

## Repo layout

```
app/
  page.tsx                  the single landing page, composes section components
  properties/[id]/page.tsx  ISR property detail page
  actions/                  Server Actions (mutations) — see below
lib/
  types.ts                  frontend Listing/UI types (pre-existing, kept stable)
  format.ts                 formatArabicNumber / formatPrice — expects plain JS numbers
  data/                     static UI config (filter tabs, nav, site info) — NOT property data anymore
  api/                      typed read helpers backed by Supabase
  supabase/                 Supabase client factories + generated-ish DB types
components/
  sections/, ui/, layout/   presentational components (mostly unchanged)
supabase/
  migrations/               SQL migrations, applied in filename order
  seed.sql                  demo owner + 3 illustrative villas (local/dev only)
  config.toml               local stack config (auth policy, ports)
  README.md                 backend setup + verification checklist
middleware.ts                refreshes the Supabase session cookie on every request
```

## Backend architecture (built 2026-07-16)

### Schema (`supabase/migrations/`, apply in order)

1. `…000001_extensions_and_enums.sql` — `btree_gist` extension + all enums (`user_role`, `property_type`, `property_status`, `booking_status`, `payment_method`, `payment_status`, `availability_status`).
2. `…000002_tables.sql` — `profiles`, `properties`, `bookings`, `property_availability`.
3. `…000003_functions_and_triggers.sql` — role helpers (`is_admin`, `is_owner_or_admin`), `handle_new_user` (auth.users → profiles), `prevent_role_escalation`, `set_updated_at`, `sync_booking_availability`.
4. `…000004_rls_policies.sql` — RLS **enabled on every table, deny-by-default**.
5. `…000005_booking_rpcs.sql` — `request_booking` / `confirm_booking` / `cancel_booking` / `set_payment_status` (SECURITY DEFINER RPCs; the trust boundary for bookings).
6. `…000006_storage.sql` — `property-images` bucket, public read, owner-scoped writes.
7. `…000007_billing.sql` — `commission_rate` snapshot column on `bookings` + the `booking_invoices` view (the "bill").

### Deviations from the original ERD (deliberate)

- **Dropped `password_hash`** from `users` — Supabase Auth (`auth.users`) owns credentials. `public.profiles` is the 1:1 app-level record (`full_name`, `phone`, `role`), created automatically by the `handle_new_user` trigger on sign-up.
- **Added `region` / `area_key`** to `properties` to match the existing frontend filter tabs in `components/sections/Listings.tsx`.
- **Payments are manual only** (`cash` / `bank_transfer`) — no online gateway (not viable for the Syrian market at launch). `payment_status` is flipped by the owner/admin via `set_payment_status`.

### Security model

- **RLS deny-by-default everywhere.** Anon/public can only `SELECT` `properties` where `status = 'active'`; everything else requires ownership or admin.
- **Booking totals are never trusted from the client.** `request_booking(property_id, check_in, check_out, payment_method)` computes `nights` and `total_price` server-side from the property's current price.
- **Anti double-booking is enforced by Postgres itself**, not application code: an `EXCLUDE USING gist` constraint on `bookings` rejects any overlapping `pending`/`confirmed` booking for the same property atomically.
- **No privilege escalation**: `prevent_role_escalation` trigger silently pins `profiles.role` to its old value unless the caller is already an admin.
- **`SUPABASE_SERVICE_ROLE_KEY` is server-only** — `lib/supabase/admin.ts` imports the `server-only` package so any accidental client-side import fails the build. Never expose it, never prefix it `NEXT_PUBLIC_`.
- Security headers (`X-Frame-Options`, HSTS, etc.) are set in `next.config.ts`.

### Caching strategy

Rule of thumb: **cache the catalogue, never cache availability or anything behind auth.**

| Data | Strategy | Source |
|---|---|---|
| Active property listings | `unstable_cache`, tag `properties` | `lib/api/properties.ts` → `getActiveProperties` |
| Property detail | ISR (`revalidate = 3600`), tag `property:{id}` | `app/properties/[id]/page.tsx` |
| Availability (booked/blocked dates) | **Uncached**, always fresh | `lib/api/availability.ts` |
| Bookings, profile | Dynamic, per-user, no cache | `lib/api/bookings.ts`, `lib/api/profile.ts` |

Writes call `revalidateTag(...)` (see `revalidateProperty` in `lib/api/properties.ts`, and the tag calls inside `app/actions/*`).

### Supabase clients (`lib/supabase/`)

- `client.ts` — browser client (anon key), for client components.
- `server.ts` — session-aware server client (reads/writes auth cookies), for Server Components/Actions. **Do not use inside `unstable_cache`** — it touches `cookies()`, which is disallowed there.
- `public.ts` — cookie-free anon client, used specifically for the cached public catalogue reads (`getActiveProperties`, `getPropertyById`) so they're safe to wrap in `unstable_cache`.
- `admin.ts` — service-role client. Server-only, bypasses RLS. Not currently called anywhere in the app (reserved for future admin/back-office tasks).
- `middleware.ts` — session refresh logic, wired into the root `middleware.ts`. No-ops gracefully if Supabase env vars are absent.
- `database.types.ts` — hand-authored to match the migrations (row types must be `type`, not `interface` — an `interface` isn't assignable to `Record<string, unknown>`, which collapses supabase-js's generic schema resolution to `never`). Regenerate the canonical version after schema changes: `supabase gen types typescript --local > lib/supabase/database.types.ts`.

### Data / API layer (`lib/api/`)

- `properties.ts` — `getActiveProperties(areaKey?)`, `getPropertyById(id)`, `toListing()` adapter (DB row → the pre-existing `Listing` UI type, keeping `pricePerNight`/`rooms`/`capacity` as plain numbers so `lib/format.ts` keeps working), `revalidateProperty()`.
- `bookings.ts` — `getMyBookings()`, `getOwnerBookings()`, `getBookingById()`. Always uncached.
- `availability.ts` — `getUnavailableDates(propertyId, from, to)`. Always uncached.
- `profile.ts` — `getMyProfile()`.
- `invoices.ts` — `getBookingInvoice(id)`, `getInvoices()`. Reads the `booking_invoices` view (the bill). Always uncached.

### Billing / invoices (the "bill")

The `bookings` row is the single source of financial truth; its money fields are **immutable snapshots** taken at booking time — `total_price` (frozen by `request_booking`) and `commission_rate` (frozen by the column DEFAULT, currently `0.15`; change the default to change the rate for *future* bookings only). The bill is a **read-only view** `booking_invoices`, not a separate table (a table would duplicate the booking and risk drift). The view is `security_barrier`, reads base tables as its owner, and enforces visibility in its own `WHERE` (`user_id = auth.uid() OR property owner OR admin`) — this both avoids RLS recursion between bookings↔properties↔profiles and lets a guest still fetch a past bill even if the property was later deactivated. It projects `platform_fee = total_price * commission_rate` and `owner_payout = total_price - platform_fee`, plus guest name/phone so owners can collect the manual payment. A dedicated `invoices` table is deferred until real accounting needs (sequential legal numbers, PDFs, refunds/credit-notes) demand it.

All reads before Supabase env is configured **degrade gracefully** (empty array / `null`) instead of throwing, so the landing page still renders pre-setup.

### Server Actions (`app/actions/`) — full CRUD, Zod-validated

| File | Actions |
|---|---|
| `auth.ts` | `signUp`, `signIn`, `signOut` |
| `property.ts` | `registerProperty` (create, starts as `draft`), `updateProperty` (patch, incl. publishing `draft → active`), `deleteProperty` |
| `booking.ts` | `requestBooking` (via RPC), `confirmBooking`, `cancelBooking`, `setPaymentStatus`, `deleteBooking` (admin-only hard delete; guests/owners should cancel instead) |
| `profile.ts` | `updateProfile` (full_name/phone only — `role` is deliberately not editable here) |
| `availability.ts` | `blockDates`, `unblockDates` (owner-managed manual blocks; `booked` rows from real bookings are always protected) |

All return `ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }` (Arabic error messages, translated from Postgres error codes in `booking.ts`'s `translate()`).

### Frontend wiring

- `components/sections/Listings.tsx` is now an async Server Component that calls `getActiveProperties()` and passes results to `components/sections/ListingsClient.tsx` (the original client-side filter-tab UI, unchanged).
- `lib/data/properties.ts` no longer holds property rows — only `filterOptions` (UI config). The 3 illustrative villas moved to `supabase/seed.sql`.
- `app/properties/[id]/page.tsx` — new ISR route: property detail + live (uncached) availability count.

## Environment

`.env.local` (git-ignored, never commit):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-only, bypasses RLS
```
`.env.local.example` is the committed template — **placeholders only, never real secrets**. The Postgres DB password (needed once, interactively, for `supabase link`) is not stored in any file.

## Running the backend

Two paths — see `supabase/README.md` for full detail:

- **CLI-managed** (preferred): `npx supabase login && npx supabase link --project-ref <ref> && npx supabase db push`. Applies all migrations in order and tracks what's applied.
- **Manual (SQL Editor)**: paste each `supabase/migrations/*.sql` file in filename order. ⚠️ If you mix manual pasting with the CLI, the CLI's migration-tracking table won't know what's already applied and a later `db push` will error with "already exists" — pick one method and stick to it, or reconcile with `supabase migration repair`.

Local dev alternative: `supabase start` boots the whole stack in Docker (not required — a hosted Supabase project works fine and needs no Docker).

## Known bugs already fixed during setup

- `confirm_booking` / `set_payment_status` / `cancel_booking` originally did `select b.*, p.owner_id into v_booking, v_owner` — invalid in PL/pgSQL (a record-typed target can't share a multi-item `INTO` list). Fixed by splitting into a scalar `owner_id` lookup plus a separate single-target row fetch. Caught live via a pasted-SQL error in the Supabase SQL Editor; verify these three functions run clean if you re-apply migrations elsewhere.

## Verification status

- ✅ `tsc --noEmit` clean; `next dev` serves the homepage (HTTP 200), including the pre-Supabase-config graceful-empty-listings path.
- ✅ **DB-level checks passed end-to-end against the live project (2026-07-16, 28/28 assertions)** using real per-role JWTs created via the Auth admin API:
  - **RLS matrix** — anon sees only `active` properties and can't write / can't read `profiles`; guest sees only their own profile and can't self-promote (escalation trigger holds); guest (role `guest`) can't insert properties; owner can insert only their own; guest can't read another guest's booking (owner can); guest can't directly UPDATE a booking's status.
  - **Price integrity** — `request_booking` computes `nights` and `total_price` server-side (4 nights × price = correct total; client can't override).
  - **Double-booking** — two concurrent overlapping `request_booking` calls: exactly one succeeds, the other gets `DATES_UNAVAILABLE`.
  - **E2E** — publish draft→active → book → owner confirm → owner mark paid → non-owner blocked from confirming (`NOT_AUTHORISED`) → guest cancels own pending → held availability nights freed.
  - Availability sync trigger verified (booked nights created on booking, removed on cancel). All test users/properties cleaned up afterward; seed villas untouched.
  - **Billing (2026-07-16, 14/14 assertions):** `commission_rate` snapshots to 0.15 on each booking; `booking_invoices` computes `platform_fee`/`owner_payout` correctly (fee + payout = total); guest reads own bill, owner reads bills on their properties (with guest name/phone), unrelated guest and anon read nothing; commission is frozen on the row, not recomputed live.
  - Note: verification ran via a throwaway Node script using `@supabase/supabase-js`; on Node 20 it needs a `ws` WebSocket polyfill (`npm i ws --no-save`, then `globalThis.WebSocket = ws`) because supabase-js's realtime client has no native WS on Node < 22.
