/**
 * Seed base recipes + materials from the manufacturer baselines, so a fresh
 * setup has a browsable starting library (not just calibration data).
 *
 *   node --env-file=.env.local scripts/seed-recipes.mjs
 *   (on the LXC: run in a node container, see SETUP_HOMELAB.md)
 *
 * For each machine_baseline it creates a Recipe on the matching machine (by
 * type + lens), and a Material for the extracted base stock (categorized).
 * Recipes are `draft` + noted as manufacturer-recommended (not yet calibrated on
 * your machine). Idempotent: skips recipes/materials that already exist.
 * Run AFTER seed-machines + seed-baselines.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.SEED_ADMIN_EMAIL;
if (!url || !key || !adminEmail) {
  console.error("✗ Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_ADMIN_EMAIL.");
  process.exit(1);
}

// descriptor keyword → [clean material name, category name]. First match wins.
const MATERIAL_MAP = [
  [/plywood/i, "Plywood", "Wood"],
  [/basswood/i, "Basswood", "Wood"],
  [/pinewood/i, "Pinewood", "Wood"],
  [/walnut/i, "Walnut", "Wood"],
  [/bamboo/i, "Bamboo", "Wood"],
  [/cork/i, "Cork", "Wood"],
  [/wood/i, "Wood", "Wood"],
  [/acrylic/i, "Acrylic", "Acrylic"],
  [/aluminum|aluminium/i, "Aluminum", "Metal"],
  [/brass/i, "Brass", "Metal"],
  [/mirror/i, "Mirror Stainless Steel", "Metal"],
  [/stainless/i, "Stainless Steel", "Metal"],
  [/carbon fiber/i, "Carbon Fiber", "Other"],
  [/painted metal|metal/i, "Metal", "Metal"],
  [/glass/i, "Glass", "Glass / Ceramics"],
  [/ceramic/i, "Ceramic", "Glass / Ceramics"],
  [/leather/i, "Leather", "Leather"],
  [/tumbler/i, "Coated Tumbler", "Tumblers / Drinkware"],
  [/cardstock|colored card|coated paper|corrugated|card|paper/i, "Paper / Card", "Paper / Card"],
  [/silk|jean|towel|cotton|felt|t-shirt|fabric/i, "Fabric", "Fabric / Textile"],
  [/eva|rubber|silicone|tpu|pvc|nylon|pet|abs|sticker|plastic|phone case/i, "Plastic", "Plastic / Silicone"],
  [/slate/i, "Slate", "Stone / Slate"],
  [/stone/i, "Stone", "Stone / Slate"],
  [/orange|apple|banana|macaron|egg|chocolate|biscuit/i, "Food", "Food"],
  [/baseball|table tennis|golf/i, "Sports Ball", "Other"],
  [/charger|pcb|usb/i, "Electronics", "Other"],
];

function extractMaterial(descriptor) {
  for (const [re, name, category] of MATERIAL_MAP) if (re.test(descriptor)) return { name, category };
  return { name: "Other", category: "Other" };
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: profile } = await supabase.from("profiles").select("id").eq("email", adminEmail).maybeSingle();
if (!profile) { console.error(`✗ No profile for ${adminEmail}. Seed the admin first.`); process.exit(1); }
const owner = profile.id;

const [{ data: machines }, { data: cats }, { data: baselines }] = await Promise.all([
  supabase.from("machines").select("id, type, lens").eq("owner_id", owner),
  supabase.from("material_categories").select("id, name").eq("owner_id", owner),
  supabase.from("machine_baselines").select("*").eq("owner_id", owner),
]);
if (!machines?.length) { console.error("✗ No machines. Run seed-machines first."); process.exit(1); }
if (!baselines?.length) { console.error("✗ No baselines. Run seed-baselines first."); process.exit(1); }

const machineByKey = new Map(machines.map((m) => [`${m.type}|${m.lens}`, m.id]));
const catByName = new Map((cats ?? []).map((c) => [c.name, c.id]));

// 1) Materials — one per distinct extracted base material.
const { data: existingMats } = await supabase.from("materials").select("id, name").eq("owner_id", owner);
const matByName = new Map((existingMats ?? []).map((m) => [m.name, m.id]));
const wanted = new Map(); // name → category
for (const b of baselines) { const { name, category } = extractMaterial(b.material_name); if (!matByName.has(name)) wanted.set(name, category); }
let matCreated = 0;
for (const [name, category] of wanted) {
  const { data, error } = await supabase.from("materials").insert({ owner_id: owner, name, category_id: catByName.get(category) ?? null }).select("id").single();
  if (error) { console.error(`✗ material ${name}: ${error.message}`); continue; }
  matByName.set(name, data.id);
  matCreated++;
}

// 2) Recipes — one per baseline, on the matching machine.
const { data: existingRecipes } = await supabase.from("recipes").select("name, machine_id").eq("owner_id", owner);
const seen = new Set((existingRecipes ?? []).map((r) => `${r.name}|${r.machine_id}`));
const rows = [];
let skipped = 0;
for (const b of baselines) {
  const machineId = machineByKey.get(`${b.machine_type}|${b.lens}`);
  if (!machineId) { skipped++; continue; }
  const mat = extractMaterial(b.material_name);
  const nameKey = `${b.material_name}|${machineId}`;
  if (seen.has(nameKey)) continue;
  seen.add(nameKey);
  rows.push({
    owner_id: owner,
    name: b.material_name,
    material_id: matByName.get(mat.name) ?? null,
    material_name: mat.name,
    process: b.process,
    machine_id: machineId,
    params: b.params,
    status: "draft",
    notes: `Manufacturer recommended setting (${b.source}${b.lens ? `, ${b.lens}` : ""}). Not yet calibrated on your machine.`,
  });
}
let recCreated = 0;
for (let i = 0; i < rows.length; i += 100) {
  const chunk = rows.slice(i, i + 100);
  const { error } = await supabase.from("recipes").insert(chunk);
  if (error) { console.error(`✗ recipes: ${error.message}`); process.exit(1); }
  recCreated += chunk.length;
}

console.log(`✓ ${matCreated} materials, ${recCreated} recipes created${skipped ? ` (${skipped} baselines had no matching machine)` : ""}.`);
