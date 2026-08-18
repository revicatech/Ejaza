import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { AvailabilityRow } from "@/lib/supabase/database.types";

/** The single source of truth for the availability cache tag. Reads (below) tag
 *  with it; every write that changes availability (request/confirm/cancel
 *  booking, block/unblock dates) calls revalidateTag with the SAME string. */
export const availabilityTag = (propertyId: string) => `availability:${propertyId}`;

/**
 * Booked/blocked nights for a property in a date range. Cached via the Data
 * Cache and tagged per-property, so it serves from cache under load but is
 * busted the instant a booking or manual block changes it — cached, yet fresh.
 * Uses the cookie-free public client (availability is public read) so it's safe
 * inside unstable_cache. `revalidate` is only a fallback ceiling; tag
 * invalidation is the real freshness mechanism.
 */
export async function getUnavailableDates(
  propertyId: string,
  from: string,
  to: string,
): Promise<AvailabilityRow[]> {
  const read = unstable_cache(
    async (pid: string, f: string, t: string) => {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from("property_availability")
        .select("*")
        .eq("property_id", pid)
        .in("status", ["booked", "blocked"])
        .gte("date", f)
        .lte("date", t);

      if (error) throw new Error(`Failed to load availability: ${error.message}`);
      return data ?? [];
    },
    ["unavailable-dates", propertyId, from, to],
    { tags: [availabilityTag(propertyId)], revalidate: 300 },
  );
  return read(propertyId, from, to);
}