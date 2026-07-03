import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminConsole } from "@/components/admin/AdminConsole";

export const metadata = { title: "Admin Console · SpectraForge" };

/**
 * Admin Console. Server-guarded: non-admins are redirected (hiding the nav is
 * UX; this is the real gate — BUILD_SPEC §3b). Admins can read all profiles via
 * RLS, so the user list is fetched with the normal server client.
 */
export default async function AdminPage() {
  const me = await getProfile();
  if (!me || me.role !== "admin" || !me.active) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: users }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: true }),
    supabase.from("workspace_settings").select("registration_open").eq("id", 1).single(),
  ]);

  return (
    <AdminConsole
      currentUserId={me.id}
      initialUsers={users ?? []}
      registrationOpen={settings?.registration_open ?? false}
    />
  );
}
