/**
 * Seed the owner's real machines (BUILD_SPEC §6-adjacent — reproducible setup).
 *
 *   node --env-file=.env.local scripts/seed-machines.mjs        # local dev
 *   (on the LXC: run in a node container, see SETUP_HOMELAB.md)
 *
 * Inserts for the SEED_ADMIN user via the service role. Idempotent: skips a
 * machine when one with the same name already exists (so it won't clobber edits
 * or duplicate on re-run). Ranges are derived from the manufacturer baselines as
 * a STARTING point — refine to true spec in Machine settings.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.SEED_ADMIN_EMAIL;
if (!url || !key || !adminEmail) {
  console.error("✗ Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_ADMIN_EMAIL.");
  process.exit(1);
}

const MACHINES = [
  { name: "ComMarker Omni XE (70mm)", manufacturer: "ComMarker", model: "Omni XE 6W UV", type: "uv", watts: 6, bed_w: 70, bed_h: 70, lens: "70mm", addons: [],
    ranges: { qpulse: { min: 1, max: 30 }, speed: { min: 10, max: 7000 }, freq: { min: 20, max: 200 }, interval: { min: 0.005, max: 0.1 }, passes: { max: 999 } } },
  { name: "ComMarker Omni XE (150mm)", manufacturer: "ComMarker", model: "Omni XE 6W UV", type: "uv", watts: 6, bed_w: 150, bed_h: 150, lens: "150mm", addons: [],
    ranges: { qpulse: { min: 1, max: 30 }, speed: { min: 5, max: 4000 }, freq: { min: 20, max: 200 }, interval: { min: 0.005, max: 0.1 }, passes: { max: 999 } } },
  { name: "Snapmaker (10W)", manufacturer: "Snapmaker", model: "10W Laser Module", type: "diode", watts: 10, bed_w: 320, bed_h: 350, lens: "10W", addons: [],
    ranges: { power: { min: 0, max: 100 }, speed: { min: 1, max: 100 }, passes: { max: 20 }, dpi: { min: 100, max: 1200 } } },
  { name: "Snapmaker (1600mW)", manufacturer: "Snapmaker", model: "1600mW Laser Module", type: "diode", watts: 2, bed_w: 320, bed_h: 350, lens: "1600mW", addons: [],
    ranges: { power: { min: 0, max: 100 }, speed: { min: 1, max: 100 }, passes: { max: 20 }, dpi: { min: 100, max: 1200 } } },
];

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: profile } = await supabase.from("profiles").select("id").eq("email", adminEmail).maybeSingle();
if (!profile) { console.error(`✗ No profile for ${adminEmail}. Seed the admin first.`); process.exit(1); }

let created = 0;
for (const m of MACHINES) {
  const { data: existing } = await supabase.from("machines").select("id").eq("owner_id", profile.id).eq("name", m.name).maybeSingle();
  if (existing) { console.log(`• ${m.name} already exists — skipped.`); continue; }
  const { error } = await supabase.from("machines").insert({ owner_id: profile.id, ...m });
  if (error) { console.error(`✗ ${m.name}: ${error.message}`); process.exit(1); }
  created++;
  console.log(`✓ ${m.name} (${m.type} · ${m.watts}W · ${m.bed_w}×${m.bed_h}mm · lens ${m.lens})`);
}
console.log(`\n✓ Seeded ${created} machine${created === 1 ? "" : "s"} for ${adminEmail}. Set true spec ranges in Machine settings.`);
