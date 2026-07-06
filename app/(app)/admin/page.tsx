import { redirect } from "next/navigation";
import { promises as fs } from "node:fs";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { STATUS_FILE, REQUEST_FILE, RUNNING_VERSION, UPDATE_CHANNEL, type UpdateStatus } from "@/lib/deploy/state";

export const metadata = { title: "Admin Console · SpectraForge" };

async function readUpdateState() {
  let last: UpdateStatus | null = null;
  try {
    last = JSON.parse(await fs.readFile(STATUS_FILE, "utf8")) as UpdateStatus;
  } catch {
    /* no update has run yet */
  }
  let pending = false;
  try {
    await fs.access(REQUEST_FILE);
    pending = true;
  } catch {
    /* none queued */
  }
  return { version: RUNNING_VERSION, channel: UPDATE_CHANNEL, last, pending };
}

/**
 * Admin Console. Server-guarded: non-admins are redirected (hiding the nav is
 * UX; this is the real gate — BUILD_SPEC §3b). Admins can read all profiles via
 * RLS, so the user list is fetched with the normal server client.
 */
export default async function AdminPage() {
  const me = await getProfile();
  if (!me || me.role !== "admin" || !me.active) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: users }, { data: settings }, update] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: true }),
    supabase.from("workspace_settings").select("registration_open").eq("id", 1).single(),
    readUpdateState(),
  ]);

  return (
    <AdminConsole
      currentUserId={me.id}
      initialUsers={users ?? []}
      registrationOpen={settings?.registration_open ?? false}
      update={update}
    />
  );
}
