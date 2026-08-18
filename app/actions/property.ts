"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidateProperty } from "@/lib/api/properties";
import { uuid } from "@/lib/validation";
import type { ActionResult, } from "./booking";
import type { PropertyRow } from "@/lib/supabase/database.types";

const propertySchema = z.object({
  type: z.enum(["villa", "hotel", "event"]),
  name: z.string().trim().min(2),
  nameAr: z.string().trim().min(2),
  city: z.string().trim().min(2),
  area: z.string().trim().min(1),
  region: z.string().trim().optional(),
  areaKey: z.string().trim().optional(),
  address: z.string().trim().optional(),
  capacity: z.number().int().positive(),
  bedrooms: z.number().int().nonnegative(),
  bathrooms: z.number().int().nonnegative(),
  pricePerNight: z.number().nonnegative(),
  amenities: z.array(z.string()).default([]),
  images: z.array(z.string().url()).default([]),
});

/**
 * Owner registers a property. owner_id is taken from the session (never the
 * client). RLS additionally enforces owner_id = auth.uid() and owner/admin role.
 * New properties start as 'draft' and go live only after review.
 */
export async function registerProperty(
  input: z.input<typeof propertySchema>,
): Promise<ActionResult<PropertyRow>> {
  const parsed = propertySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "يجب تسجيل الدخول." };

  const p = parsed.data;
  const { data, error } = await supabase
    .from("properties")
    .insert({
      owner_id: user.id,
      type: p.type,
      name: p.name,
      name_ar: p.nameAr,
      city: p.city,
      area: p.area,
      region: p.region ?? null,
      area_key: p.areaKey ?? null,
      address: p.address ?? null,
      capacity: p.capacity,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      price_per_night: p.pricePerNight,
      amenities: p.amenities,
      images: p.images,
      status: "draft",
    })
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidateProperty(data.id);
  return { ok: true, data };
}

// All fields optional for a patch; status lets an owner publish (draft->active)
// or unlist. RLS enforces that only the owner (or admin) can touch the row.
const updateSchema = propertySchema.partial().extend({
  id: uuid,
  status: z.enum(["draft", "pending_review", "active", "inactive"]).optional(),
});

/** Owner/admin updates a property. Only provided fields are changed. */
export async function updateProperty(
  input: z.input<typeof updateSchema>,
): Promise<ActionResult<PropertyRow>> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة." };
  }
  const { id, ...p } = parsed.data;

  // Map camelCase input to DB columns, skipping undefined so it's a true patch.
  const patch: Partial<PropertyRow> = {};
  if (p.type !== undefined) patch.type = p.type;
  if (p.name !== undefined) patch.name = p.name;
  if (p.nameAr !== undefined) patch.name_ar = p.nameAr;
  if (p.city !== undefined) patch.city = p.city;
  if (p.area !== undefined) patch.area = p.area;
  if (p.region !== undefined) patch.region = p.region;
  if (p.areaKey !== undefined) patch.area_key = p.areaKey;
  if (p.address !== undefined) patch.address = p.address;
  if (p.capacity !== undefined) patch.capacity = p.capacity;
  if (p.bedrooms !== undefined) patch.bedrooms = p.bedrooms;
  if (p.bathrooms !== undefined) patch.bathrooms = p.bathrooms;
  if (p.pricePerNight !== undefined) patch.price_per_night = p.pricePerNight;
  if (p.amenities !== undefined) patch.amenities = p.amenities;
  if (p.images !== undefined) patch.images = p.images;
  if (p.status !== undefined) patch.status = p.status;

  if (Object.keys(patch).length === 0) return { ok: false, error: "لا يوجد تغييرات." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "العقار غير موجود أو لا تملك صلاحية تعديله." };
  revalidateProperty(id);
  return { ok: true, data };
}

/** Owner/admin deletes a property (RLS enforces ownership). */
export async function deleteProperty(
  input: { id: string },
): Promise<ActionResult<null>> {
  const parsed = z.object({ id: uuid }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "معرّف غير صالح." };

  const supabase = await createClient();
  const { error } = await supabase.from("properties").delete().eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };
  revalidateProperty(parsed.data.id);
  return { ok: true, data: null };
}
