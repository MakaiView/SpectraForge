import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { ActiveMachineProvider, type ActiveMachineOption } from "@/components/shell/ActiveMachineProvider";
import type { MachineTypeKey } from "@/lib/params/schema";

/**
 * Authed shell layout. Middleware already redirects unauthenticated requests,
 * but we re-check on the server here and pass the real profile (name, role,
 * company) down so the sidebar avatar + admin gating are driven by the DB, not
 * the client (BUILD_SPEC §3b). Machines feed the active-machine switcher.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [{ data }, { data: settings }, reviewRecipes, reviewAttempts] = await Promise.all([
    supabase.from("machines").select("id, name, type").order("created_at", { ascending: true }),
    supabase.from("user_settings").select("onboarded").eq("id", profile.id).single(),
    supabase.from("recipes").select("id", { count: "exact", head: true }).eq("status", "review"),
    supabase.from("attempts").select("id", { count: "exact", head: true }).in("outcome", ["marginal", "fail"]),
  ]);
  const machines: ActiveMachineOption[] = (data ?? []).map((m) => ({ id: m.id, name: m.name, type: m.type as MachineTypeKey }));
  const reviewCount = (reviewRecipes.count ?? 0) + (reviewAttempts.count ?? 0);

  return (
    <ActiveMachineProvider machines={machines}>
      <AppShell
        user={{
          name: profile.name || profile.email,
          company: profile.company,
          role: profile.role,
        }}
        onboarded={settings?.onboarded ?? true}
        reviewCount={reviewCount}
      >
        {children}
      </AppShell>
    </ActiveMachineProvider>
  );
}
