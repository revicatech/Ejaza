"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uuid } from "@/lib/validation";
import type { ActionResult } from "@/app/actions/booking";

/**
 * Returns the calling user IF they are an admin, else null. Every action here
 * must call this first — it is the authorization gate before we ever touch the
 * service-role client (which bypasses RLS entirely).
 */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin" ? user : null;
}

const createOwnerSchema = z.object({
  fullName: z.string().trim().min(2, "الاسم قصير جداً."),
  phone: z.string().trim().regex(/^\+?\d{7,15}$/, "رقم هاتف غير صالح.").optional(),
  email: z.string().trim().email("بريد إلكتروني غير صالح."),
  password: z
    .string()
    .min(8, "كلمة المرور 8 أحرف على الأقل.")
    .regex(/[a-z]/, "حرف صغير مطلوب.")
    .regex(/[A-Z]/, "حرف كبير مطلوب.")
    .regex(/\d/, "رقم مطلوب."),
});

/** Admin creates a pre-confirmed owner account. The owner can sign in
 *  immediately with the credentials and start adding properties. */
export async function createOwner(
  input: z.input<typeof createOwnerSchema>,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "صلاحية المدير مطلوبة." };

  const parsed = createOwnerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة." };
  }

  const svc = createAdminClient();
  const { data, error } = await svc.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true, // pre-confirmed so the owner can log in right away
    user_metadata: { full_name: parsed.data.fullName, phone: parsed.data.phone ?? null },
  });
  if (error) return { ok: false, error: error.message };

  // handle_new_user created the profile as 'guest'; promote to owner.
  const { error: rErr } = await svc.from("profiles").update({ role: "owner" }).eq("id", data.user.id);
  if (rErr) return { ok: false, error: rErr.message };

  return { ok: true, data: { id: data.user.id } };
}

const roleSchema = z.object({
  userId: uuid,
  role: z.enum(["guest", "owner", "admin"]),
});

/** Admin changes a user's role. Cannot change your own (avoids self-lockout). */
export async function setUserRole(
  input: z.input<typeof roleSchema>,
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "صلاحية المدير مطلوبة." };

  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة." };
  if (parsed.data.userId === admin.id) return { ok: false, error: "لا يمكنك تغيير دورك بنفسك." };

  const svc = createAdminClient();
  const { error } = await svc
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.userId);
  if (error) return { ok: false, error: error.message };

  return { ok: true, data: null };
}