import { createClient } from "@/lib/supabase/server";
import type { BookingRow } from "@/lib/supabase/database.types";

// Bookings are per-user and sensitive — always read fresh through the session
// client (RLS scopes rows to the guest, the property owner, or an admin). Never
// cached.

/** The signed-in guest's own bookings, newest first. */
export async function getMyBookings(): Promise<BookingRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load bookings: ${error.message}`);
  return data ?? [];
}

/** Bookings across the owner's properties (RLS returns only rows they own). */
export async function getOwnerBookings(): Promise<BookingRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("bookings")
    .select("*, properties!inner(owner_id)")
    .eq("properties.owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load owner bookings: ${error.message}`);
  return (data ?? []) as unknown as BookingRow[];
}

/** A single booking by id (RLS decides visibility). */
export async function getBookingById(id: string): Promise<BookingRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load booking: ${error.message}`);
  return data;
}
