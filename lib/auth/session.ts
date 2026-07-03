import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/db";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/** The signed-in user's profile (role, active, name…), or null if no session. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data ?? null;
}

/** True when the signed-in user is an active admin. Never trust the client. */
export async function isAdmin(): Promise<boolean> {
  const p = await getProfile();
  return !!p && p.role === "admin" && p.active;
}

/**
 * Server-route guard: returns the caller's admin profile or throws. Every admin
 * API route calls this first (BUILD_SPEC §3b — re-check on the server, don't
 * rely on hidden nav).
 */
export async function requireAdmin(): Promise<Profile> {
  const p = await getProfile();
  if (!p || p.role !== "admin" || !p.active) {
    throw new AuthorizationError("Admin privileges required.");
  }
  return p;
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}
