/**
 * Seed the first admin — run once after `supabase start` (BUILD_SPEC §3b).
 *
 * Registration ships closed, so the first admin must be created outside the
 * sign-up path. This uses the service role to create the auth user with
 * role=admin in its metadata; the handle_new_user trigger (migration 0001)
 * creates the matching admin profile. Idempotent: skips if the email exists.
 *
 *   node scripts/seed-admin.mjs
 *
 * Reads SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME /
 * SEED_ADMIN_COMPANY and Supabase URL + service key from the environment
 * (.env.local is loaded automatically when run via `npm run db:seed-admin`).
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
const name = process.env.SEED_ADMIN_NAME || "Admin";
const company = process.env.SEED_ADMIN_COMPANY || "";

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!url || !serviceKey) fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
if (!email || !password) fail("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set (see .env.example).");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Skip if a profile with this email already exists (idempotent re-runs).
const { data: existing } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
if (existing) {
  console.log(`• Admin ${email} already exists — nothing to do.`);
  process.exit(0);
}

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name, company, role: "admin", active: true },
});

if (error) fail(`Failed to create admin: ${error.message}`);
console.log(`✓ Seeded first admin ${email} (id ${data.user.id}). Registration remains closed.`);
