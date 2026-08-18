"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./booking";
import type { ProfileRow } from "@/lib/supabase/database.types";

// Note: role is intentionally NOT updatable here — the prevent_role_escalation
// trigger pins it for non-admins even if it were sent.
const profileSchema = z
  .object({
    fullName: z.string().trim().min(2, "الاسم قصير جداً.").optional(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?\d{7,15}$/, "رقم هاتف غير صالح.")
      .optional(),
  })
  .refine((v) => v.fullName !== undefined || v.phone !== undefined, {
    message: "لا يوجد تغييرات.",
  });

/** Update the signed-in user's own profile (RLS: own row). */
export async function updateProfile(
  input: z.input<typeof profileSchema>,
): Promise<ActionResult<ProfileRow>> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "يجب تسجيل الدخول." };

  const patch: Partial<ProfileRow> = {};
  if (parsed.data.fullName !== undefined) patch.full_name = parsed.data.fullName;
  if (parsed.data.phone !== undefined) patch.phone = parsed.data.phone;

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}
