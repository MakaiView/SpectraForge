import { createClient } from "@/lib/supabase/server";
import { AuthGate } from "@/components/auth/AuthGate";

export const metadata = { title: "Sign in · SpectraForge" };

// Reads the registration flag from Supabase — not statically pre-rendered.
export const dynamic = "force-dynamic";

/**
 * The auth gate. Reads registration_open server-side (RLS allows anon read) so
 * the gate shows the correct copy: a "Create one" link when open, or
 * "Registration is by invitation only" when closed (BUILD_SPEC §3a).
 */
export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspace_settings")
    .select("registration_open")
    .eq("id", 1)
    .single();

  return <AuthGate registrationOpen={data?.registration_open ?? false} />;
}
