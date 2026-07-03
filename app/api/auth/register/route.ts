import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Public sign-up — gated server-side (BUILD_SPEC §3b). A closed
 * registration flag MUST reject here, not merely hide the link. New users are
 * always `member` + active; role escalation only happens via admin routes.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // Enforce the registration flag on the server. Anon read is allowed by RLS.
  const { data: settings } = await supabase
    .from("workspace_settings")
    .select("registration_open")
    .eq("id", 1)
    .single();

  if (!settings?.registration_open) {
    return NextResponse.json({ error: "Registration is currently closed." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = (body?.name ?? "").trim();
  const email = (body?.email ?? "").trim();
  const company = (body?.company ?? "").trim();
  const password = body?.password ?? "";

  if (!name) return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 4) return NextResponse.json({ error: "Password must be at least 4 characters." }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, company, role: "member", active: true },
  });

  if (error) {
    // Supabase returns a conflict for an existing email.
    const isDuplicate = /already|exists|registered/i.test(error.message);
    return NextResponse.json(
      { error: isDuplicate ? "An account with that email already exists." : "Could not create your account." },
      { status: isDuplicate ? 409 : 400 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
