"use server";

import { z } from "zod";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation";
import { availabilityTag } from "@/lib/api/availability";
import type { BookingRow, PaymentStatus } from "@/lib/supabase/database.types";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// Map raw Postgres RPC errors to friendly Arabic messages.
const bookingErrorMessage: Record<string, string> = {
  AUTH_REQUIRED: "يجب تسجيل الدخول لإتمام الحجز.",
  INVALID_DATE_RANGE: "تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول.",
  PROPERTY_NOT_FOUND: "العقار غير موجود.",
  PROPERTY_NOT_BOOKABLE: "هذا العقار غير متاح للحجز حالياً.",
  DATES_UNAVAILABLE: "التواريخ المختارة محجوزة. الرجاء اختيار تواريخ أخرى.",
  BOOKING_NOT_FOUND: "الحجز غير موجود.",
  NOT_AUTHORISED: "لا تملك صلاحية لهذا الإجراء.",
  CANNOT_CANCEL: "لا يمكن إلغاء هذا الحجز.",
};

function translate(message: string): string {
  const key = Object.keys(bookingErrorMessage).find((k) => message.includes(k));
  if (key) return bookingErrorMessage[key];
  // A logged-out caller hits "permission denied for function ..." because the
  // booking RPCs are granted to the authenticated role only.
  if (/permission denied/i.test(message)) return bookingErrorMessage.AUTH_REQUIRED;
  return "حدث خطأ غير متوقع. حاول مرة أخرى.";
}

const requestBookingSchema = z
  .object({
    propertyId: uuid,
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "INVALID_DATE"),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "INVALID_DATE"),
    paymentMethod: z.enum(["cash", "bank_transfer"]).default("cash"),
  })
  .refine((v) => v.checkOut > v.checkIn, { message: "INVALID_DATE_RANGE" });

/** Guest requests a booking. Totals are computed by the DB RPC, never here. */
export async function requestBooking(
  input: z.input<typeof requestBookingSchema>,
): Promise<ActionResult<BookingRow>> {
  const parsed = requestBookingSchema.safeParse(input);
  if (!parsed.success) {
    // Surface the real reason instead of always blaming the date range.
    const msgs = parsed.error.issues.map((i) => i.message);
    const error = msgs.includes("INVALID_DATE_RANGE")
      ? bookingErrorMessage.INVALID_DATE_RANGE
      : "بيانات الحجز غير صالحة.";
    return { ok: false, error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_booking", {
    p_property_id: parsed.data.propertyId,
    p_check_in: parsed.data.checkIn,
    p_check_out: parsed.data.checkOut,
    p_payment_method: parsed.data.paymentMethod,
  });

  if (error) return { ok: false, error: translate(error.message) };
  revalidateTag(availabilityTag(parsed.data.propertyId));
  return { ok: true, data: data as BookingRow };
}

const bookingIdSchema = z.object({ bookingId: uuid });

/** Owner/admin confirms a booking. */
export async function confirmBooking(
  input: z.input<typeof bookingIdSchema>,
): Promise<ActionResult<BookingRow>> {
  const parsed = bookingIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "معرّف حجز غير صالح." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_booking", {
    p_booking_id: parsed.data.bookingId,
  });
  if (error) return { ok: false, error: translate(error.message) };
  revalidateTag(availabilityTag((data as BookingRow).property_id));
  return { ok: true, data: data as BookingRow };
}

/** Guest/owner/admin cancels a booking (frees the held nights). */
export async function cancelBooking(
  input: z.input<typeof bookingIdSchema>,
): Promise<ActionResult<BookingRow>> {
  const parsed = bookingIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "معرّف حجز غير صالح." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_booking", {
    p_booking_id: parsed.data.bookingId,
  });
  if (error) return { ok: false, error: translate(error.message) };
  revalidateTag(availabilityTag((data as BookingRow).property_id));
  return { ok: true, data: data as BookingRow };
}

/** Hard-delete a booking. RLS ("bookings: admin write") restricts this to
 *  admins — guests and owners should cancel, not delete. */
export async function deleteBooking(
  input: z.input<typeof bookingIdSchema>,
): Promise<ActionResult<null>> {
  const parsed = bookingIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "معرّف حجز غير صالح." };

  const supabase = await createClient();
  // Read property_id first so we can bust the availability cache after delete.
  const { data: existing } = await supabase
    .from("bookings")
    .select("property_id")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();

  const { error } = await supabase.from("bookings").delete().eq("id", parsed.data.bookingId);
  if (error) return { ok: false, error: translate(error.message) };
  if (existing) revalidateTag(availabilityTag(existing.property_id));
  return { ok: true, data: null };
}

const paymentSchema = bookingIdSchema.extend({
  status: z.enum(["unpaid", "pending", "paid", "refunded"]),
});

/** Owner/admin records manual (cash / bank transfer) payment state. */
export async function setPaymentStatus(
  input: z.input<typeof paymentSchema>,
): Promise<ActionResult<BookingRow>> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_payment_status", {
    p_booking_id: parsed.data.bookingId,
    p_status: parsed.data.status as PaymentStatus,
  });
  if (error) return { ok: false, error: translate(error.message) };
  return { ok: true, data: data as BookingRow };
}
