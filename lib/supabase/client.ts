"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/db";

/**
 * Browser-side Supabase client (anon key only — safe in the bundle).
 * Used by client components for auth flows and RLS-scoped reads.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
