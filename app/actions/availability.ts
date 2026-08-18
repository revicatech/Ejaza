"use server";

import { z } from "zod";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation";
import { availabilityTag } from "@/lib/api/availability";
import type { ActionResult } from "./booking";

const schema = z.object({
  propertyId: uuid,
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
});

/**
 * Owner blocks dates on their own property (e.g. maintenance, personal use).
 * ignoreDuplicates leaves any existing 'booked' rows untouched — you can never
 * turn a real booking into a manual block. RLS enforces property ownership.
 */
export async function blockDates(
  input: z.input<typeof schema>,
): Promise<ActionResult<null>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة." };

  const rows = parsed.data.dates.map((date) => ({
    property_id: parsed.data.propertyId,
    date,
    status: "blocked" as const,
    booking_id: null,
  }));

  const supabase = await createClient();
  const { error } = await supabase
    .from("property_availability")
    .upsert(rows, { onConflict: "property_id,date", ignoreDuplicates: true });

  if (error) return { ok: false, error: error.message };
  revalidateTag(availabilityTag(parsed.data.propertyId));
  return { ok: true, data: null };
}

/** Owner unblocks dates. Only 'blocked' rows are removed — 'booked' nights are
 *  protected and left intact. */
export async function unblockDates(
  input: z.input<typeof schema>,
): Promise<ActionResult<null>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("property_availability")
    .delete()
    .eq("property_id", parsed.data.propertyId)
    .eq("status", "blocked")
    .in("date", parsed.data.dates);

  if (error) return { ok: false, error: error.message };
  revalidateTag(availabilityTag(parsed.data.propertyId));
  return { ok: true, data: null };
}
