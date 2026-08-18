import { createClient } from "@/lib/supabase/server";
import type { BookingInvoiceRow } from "@/lib/supabase/database.types";

// The bill. Reads the booking_invoices view, which is per-user and money-
// sensitive — always fresh (uncached), and the view's own WHERE + RLS decide
// visibility (guest sees own; owner sees bills on their properties; admin all).

/** A single bill by booking id. Null if it doesn't exist or isn't visible. */
export async function getBookingInvoice(
  bookingId: string,
): Promise<BookingInvoiceRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booking_invoices")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load invoice: ${error.message}`);
  return data;
}

/** Bills for bookings on the signed-in owner's properties (their incoming
 *  bookings, with guest name/phone for collecting the manual payment). */
export async function getOwnerInvoices(): Promise<BookingInvoiceRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // My property ids, then the bills against them. The booking_invoices view
  // already scopes rows to what I can see; narrowing to my properties excludes
  // any bill where I was the guest on someone else's listing.
  const { data: mine } = await supabase.from("properties").select("id").eq("owner_id", user.id);
  const ids = (mine ?? []).map((p) => p.id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("booking_invoices")
    .select("*")
    .in("property_id", ids)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load owner invoices: ${error.message}`);
  return data ?? [];
}

/** The signed-in user's own bookings as a guest (their "my bookings"), newest
 *  first. Filters the view to rows where they are the booker. */
export async function getMyBookingInvoices(): Promise<BookingInvoiceRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("booking_invoices")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load your bookings: ${error.message}`);
  return data ?? [];
}

/** Every bill visible to the signed-in user (their own bookings + bookings on
 *  properties they own), newest first. */
export async function getInvoices(): Promise<BookingInvoiceRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("booking_invoices")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load invoices: ${error.message}`);
  return data ?? [];
}
