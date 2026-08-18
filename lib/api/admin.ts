import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/supabase/database.types";

export type AdminUser = {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
};

async function callerIsAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin";
}

/** All users with role (from profiles) + email (from auth.users). Admin only —
 *  returns [] for anyone else even if called directly. */
export async function listAllUsers(): Promise<AdminUser[]> {
  if (!(await callerIsAdmin())) return [];

  const supabase = await createClient();
  // Admin RLS lets the session client read every profile.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  // Emails live in auth.users — reachable only via the service-role client.
  const svc = createAdminClient();
  const { data: authList } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
  const emailById = new Map(authList.users.map((u) => [u.id, u.email ?? null]));

  return (profiles ?? []).map((p) => ({
    id: p.id,
    email: emailById.get(p.id) ?? null,
    full_name: p.full_name,
    phone: p.phone,
    role: p.role,
    created_at: p.created_at,
  }));
}