"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./booking";
import type { UserRole } from "@/lib/supabase/database.types";

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "الاسم قصير جداً."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?\d{7,15}$/, "رقم هاتف غير صالح.")
    .optional(),
  email: z.string().trim().email("بريد إلكتروني غير صالح."),
  // Mirror the DB password policy: lower + upper + digits, min 8.
  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل.")
    .regex(/[a-z]/, "يجب أن تحتوي على حرف صغير.")
    .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير.")
    .regex(/\d/, "يجب أن تحتوي على رقم."),
});

export async function signUp(
  input: z.input<typeof signUpSchema>,
): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    // Consumed by the handle_new_user trigger to populate profiles.
    options: { data: { full_name: parsed.data.fullName, phone: parsed.data.phone ?? null } },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { needsConfirmation: !data.session } };
}

const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function signIn(
  input: z.input<typeof signInSchema>,
): Promise<ActionResult<{ role: UserRole | null }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات الدخول غير صالحة." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: "بريد إلكتروني أو كلمة مرور غير صحيحة." };

  // Role decides where the login form sends the user (owners → dashboard).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  return { ok: true, data: { role: profile?.role ?? null } };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
