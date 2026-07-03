/**
 * Seed manufacturer baselines from the transcribed importer files in
 * seed/manufacturer-presets/baselines/. Reusable for prod (BUILD_SPEC §6).
 *
 *   node --env-file=.env.local scripts/seed-baselines.mjs
 *
 * Each .txt file carries `# key: value` headers (machine_type, lens, source)
 * followed by data lines `material | process | key=val, key=val`. Rows are
 * inserted for the SEED_ADMIN user via the service role. Idempotent: re-running
 * replaces that owner's baselines for each file's source.
 *
 * Numbers are transcribed from the owner's manufacturer PDFs — never invented.
 * Snapmaker Work Speed (mm/min) is pre-converted to the app's mm/s in the files.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.SEED_ADMIN_EMAIL;
if (!url || !key || !adminEmail) {
  console.error("✗ Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_ADMIN_EMAIL.");
  process.exit(1);
}

const PARAM_KEYS = new Set(["power", "speed", "freq", "qpulse", "pulse", "interval", "dpi", "passes"]);
const PROCS = new Set(["cut", "engrave", "mark"]);

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "seed", "manufacturer-presets", "baselines");

function parseFile(text) {
  const meta = { machine_type: "", lens: "", source: "manufacturer" };
  const rows = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^#\s*(\w+)\s*:\s*(.+)$/);
    if (m) { meta[m[1]] = m[2].trim(); continue; }
    if (line.startsWith("#")) continue;
    const parts = line.split("|").map((s) => s.trim());
    if (parts.length < 3) continue;
    const [material, process, paramStr] = parts;
    if (!material || !PROCS.has(process)) continue;
    const params = {};
    for (const pair of paramStr.split(",")) {
      const [k, v] = pair.split("=").map((s) => s.trim());
      if (PARAM_KEYS.has(k) && v !== undefined && v !== "" && !Number.isNaN(Number(v))) params[k] = Number(v);
    }
    if (Object.keys(params).length) rows.push({ material, process, params });
  }
  return { meta, rows };
}

const { data: profile } = await supabase.from("profiles").select("id").eq("email", adminEmail).maybeSingle();
if (!profile) { console.error(`✗ No profile for ${adminEmail}. Seed the admin first.`); process.exit(1); }

let total = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".txt")).sort()) {
  const { meta, rows } = parseFile(readFileSync(join(dir, file), "utf8"));
  if (!meta.machine_type || rows.length === 0) { console.log(`• ${file}: skipped (no machine_type/rows)`); continue; }

  // Replace this owner's baselines for this source + lens (clean re-runs).
  await supabase.from("machine_baselines").delete().eq("owner_id", profile.id).eq("source", meta.source).eq("machine_type", meta.machine_type).eq("lens", meta.lens);

  const insertRows = rows.map((r) => ({
    owner_id: profile.id,
    machine_type: meta.machine_type,
    lens: meta.lens,
    material_name: r.material,
    process: r.process,
    params: r.params,
    source: meta.source,
  }));
  const { error } = await supabase.from("machine_baselines").insert(insertRows);
  if (error) { console.error(`✗ ${file}: ${error.message}`); process.exit(1); }
  total += insertRows.length;
  console.log(`✓ ${file}: ${insertRows.length} baselines (${meta.source} · ${meta.machine_type} · ${meta.lens || "no lens"})`);
}
console.log(`\n✓ Seeded ${total} manufacturer baselines for ${adminEmail}.`);
