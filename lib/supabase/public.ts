import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cookie-free anon Supabase client for cached, public reads (the property
 * catalogue). Because it never touches cookies()/headers(), it is safe to call
 * inside unstable_cache — unlike the session-aware server client. RLS still
 * applies as the anon role (only 'active' properties are visible).
 */
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
