import { NextResponse } from "next/server";
import { requireAdmin, AuthorizationError } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function guard() {
  try {
    return await requireAdmin();
  } catch (e) {
    if (e instanceof AuthorizationError) return null;
    throw e;
  }
}

/**
 * Edit a user (admin-only): name, email, company, role, active, optional
 * password reset. Self-protection: an admin cannot disable or demote… we allow
 * role/name edits on self but block flipping their own `active` to false, since
 * a locked-out sole admin is unrecoverable (mirrors the delete guard).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await guard();
  if (!me) return NextResponse.json({ error: "Admin privileges required." }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const name = (body?.name ?? "").trim();
  const email = (body?.email ?? "").trim();
  const company = (body?.company ?? "").trim();
  const role = body?.role === "admin" ? "admin" : "member";
  const active = body?.active !== false;
  const password: string | undefined = body?.password || undefined;

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password !== undefined && password.length < 4) {
    return NextResponse.json({ error: "Password must be at least 4 characters." }, { status: 400 });
  }
  if (id === me.id && !active) {
    return NextResponse.json({ error: "You can't disable your own account." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Update the auth user (email/password/metadata) …
  const { error: authError } = await admin.auth.admin.updateUserById(id, {
    email,
    ...(password ? { password } : {}),
    user_metadata: { name, company, role, active },
  });
  if (authError) {
    const isDuplicate = /already|exists|registered/i.test(authError.message);
    return NextResponse.json(
      { error: isDuplicate ? "Another account already uses that email." : "Could not update the user." },
      { status: isDuplicate ? 409 : 400 }
    );
  }

  // … and the profile row (metadata triggers don't fire on update).
  const { error: profileError } = await admin
    .from("profiles")
    .update({ name, email, company, role, active })
    .eq("id", id);
  if (profileError) return NextResponse.json({ error: "Could not update the profile." }, { status: 400 });

  return NextResponse.json({ ok: true });
}

/** Delete a user (admin-only). Guard: cannot delete your own account. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await guard();
  if (!me) return NextResponse.json({ error: "Admin privileges required." }, { status: 403 });

  const { id } = await params;
  if (id === me.id) return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });

  const admin = createAdminClient();
  // Deleting the auth user cascades to the profile (FK on delete cascade).
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: "Could not delete the user." }, { status: 400 });

  return NextResponse.json({ ok: true });
}
