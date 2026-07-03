import { NextResponse } from "next/server";
import { requireAdmin, AuthorizationError } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Create a user (admin-only). Re-verifies admin on the server, then creates the
 * auth user via the service role with role/active in metadata (the
 * handle_new_user trigger writes the matching profile). BUILD_SPEC §3b.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AuthorizationError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }

  const body = await request.json().catch(() => null);
  const name = (body?.name ?? "").trim();
  const email = (body?.email ?? "").trim();
  const company = (body?.company ?? "").trim();
  const password = body?.password ?? "";
  const role = body?.role === "admin" ? "admin" : "member";
  const active = body?.active !== false;

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 4) return NextResponse.json({ error: "Set a password of at least 4 characters." }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, company, role, active },
  });

  if (error) {
    const isDuplicate = /already|exists|registered/i.test(error.message);
    return NextResponse.json(
      { error: isDuplicate ? "Another account already uses that email." : "Could not create the user." },
      { status: isDuplicate ? 409 : 400 }
    );
  }

  return NextResponse.json({ ok: true, id: data.user.id }, { status: 201 });
}
