import { NextResponse } from "next/server";
import { requireAdmin, AuthorizationError } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Toggle the workspace registration flag (admin-only). RLS also restricts the
 * update to admins, but we re-check here so the route fails fast with a clean
 * error. BUILD_SPEC §3b.
 */
export async function PATCH(request: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AuthorizationError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }

  const body = await request.json().catch(() => null);
  const open = body?.open === true;

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_settings")
    .update({ registration_open: open, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) return NextResponse.json({ error: "Could not update registration." }, { status: 400 });
  return NextResponse.json({ ok: true, registration_open: open });
}
