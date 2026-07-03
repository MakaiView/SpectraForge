import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

/**
 * SERVICE-ROLE client — bypasses RLS. SERVER-ONLY. Never import into a client
 * component or expose the key. Used exclusively by admin-only route handlers
 * (create/edit/disable/delete users) and the first-admin seed path
 * (BUILD_SPEC §3b). Every caller MUST independently re-verify the requester is
 * an admin before using this — the service role trusts no one.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set — refusing to create admin client.");
  }
  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
