import { cache } from "react";
import { unstable_cache, revalidateTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { PropertyRow } from "@/lib/supabase/database.types";
import type { Listing, Region } from "@/lib/types";

export const PROPERTIES_TAG = "properties";
export const propertyTag = (id: string) => `property:${id}`;

/** Whether Supabase env is present. Before the backend is wired up, the read
 *  path degrades to an empty catalogue instead of crashing the landing page. */
function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Currency codes stored in the DB, rendered as the Arabic symbol in the UI. */
const currencySymbol: Record<string, string> = { SYP: "ل.س", USD: "$" };

/** Normalise the free-text region column to the two values the UI supports. */
function toRegion(region: string | null): Region {
  return region === "coast" ? "coast" : "damascus-countryside";
}

/** Maps a DB property row to the frontend Listing shape (numbers kept intact
 *  so lib/format.ts continues to work). */
export function toListing(p: PropertyRow): Listing {
  return {
    id: p.id,
    category: p.type,
    region: toRegion(p.region),
    area: p.area,
    areaKey: p.area_key ?? "all",
    title: p.name_ar || p.name,
    image: p.images[0] ?? "",
    imageAlt: p.name_ar || p.name,
    pricePerNight: Number(p.price_per_night),
    currency: currencySymbol[p.currency] ?? p.currency,
    rooms: p.bedrooms,
    capacity: p.capacity,
    highlight: p.amenities[0] ?? "",
    isExample: false,
  };
}

/**
 * Active listings for the public catalogue. Cached via the Data Cache and
 * tagged so writes can invalidate it. Wrapped in React cache() for per-request
 * dedup. Availability is NOT read here — that stays uncached (see availability.ts).
 */
export const getActiveProperties = cache(
  unstable_cache(
    async (areaKey?: string): Promise<Listing[]> => {
      if (!isSupabaseConfigured()) {
        console.warn("[ejaza] Supabase not configured — returning empty listings.");
        return [];
      }
      const supabase = createPublicClient();
      let query = supabase.from("properties").select("*").eq("status", "active");
      if (areaKey && areaKey !== "all") query = query.eq("area_key", areaKey);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw new Error(`Failed to load properties: ${error.message}`);
      return (data ?? []).map(toListing);
    },
    ["active-properties"],
    { tags: [PROPERTIES_TAG], revalidate: 3600 },
  ),
);

export async function getPropertyById(id: string): Promise<PropertyRow | null> {
  if (!isSupabaseConfigured()) return null;
  const read = unstable_cache(
    async (propertyId: string) => {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .maybeSingle();
      if (error) throw new Error(`Failed to load property: ${error.message}`);
      return data;
    },
    ["property-by-id", id],
    { tags: [PROPERTIES_TAG, propertyTag(id)], revalidate: 3600 },
  );
  return read(id);
}

/** The signed-in owner's own properties (any status). Uncached, per-user —
 *  RLS lets an owner read their own rows regardless of status. */
export async function getMyProperties(): Promise<PropertyRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load your properties: ${error.message}`);
  return data ?? [];
}

/** A single property the caller owns (any status), for the owner management
 *  page. Returns null if it doesn't exist or the caller isn't its owner/admin. */
export async function getOwnedProperty(id: string): Promise<PropertyRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load property: ${error.message}`);
  if (!data) return null;
  // RLS may return an active property the user doesn't own — gate to ownership.
  if (data.owner_id !== user.id) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return null;
  }
  return data;
}

/** Invalidate cached catalogue reads after a property write. */
export function revalidateProperty(id?: string) {
  revalidateTag(PROPERTIES_TAG);
  if (id) revalidateTag(propertyTag(id));
}
