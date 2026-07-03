import { createClient } from "@/lib/supabase/server";
import { PARAM_DEFS, TYPE_PARAMS, formatParam, type MachineTypeKey, type ParamKey } from "@/lib/params/schema";
import type { GroundingFact } from "@/lib/ai/suggest";

function paramsToText(type: MachineTypeKey, params: Record<string, unknown>): string {
  return TYPE_PARAMS[type]
    .map((k) => (typeof params[k] === "number" ? `${PARAM_DEFS[k as ParamKey].short} ${formatParam(k, params[k] as number)}` : null))
    .filter(Boolean)
    .join(", ");
}

/**
 * Retrieve grounding facts for a suggestion (RAG-lite, no embeddings yet —
 * BUILD_SPEC §5b). Pulls the owner's manufacturer baselines, promoted recipes,
 * and logged attempts that match this machine type / material / process, so the
 * model reasons from real data rather than hallucinating (deferred: pgvector
 * semantic retrieval).
 */
export async function getGrounding(type: MachineTypeKey, machineId: string | null, material: string, process: "cut" | "engrave" | "mark"): Promise<GroundingFact[]> {
  const supabase = await createClient();
  const facts: GroundingFact[] = [];
  const mat = material.trim();

  // Baselines (manufacturer presets) — the strongest grounding.
  let bq = supabase.from("machine_baselines").select("lens, material_name, process, params, params, machine_type").eq("machine_type", type).eq("process", process).limit(4);
  if (mat) bq = bq.ilike("material_name", `%${mat}%`);
  const { data: baselines } = await bq;
  for (const b of baselines ?? []) {
    const t = paramsToText(type, (b.params as Record<string, unknown>) ?? {});
    if (t) facts.push({ kind: "baseline", text: `${b.lens ? b.lens + " " : ""}baseline for ${b.material_name || "material"} (${b.process}): ${t}` });
  }

  // The user's own promoted/calibrated recipes.
  let rq = supabase.from("recipes").select("name, status, params, process").eq("process", process).order("status", { ascending: false }).limit(3);
  if (machineId) rq = rq.eq("machine_id", machineId);
  if (mat) rq = rq.ilike("material_name", `%${mat}%`);
  const { data: recipes } = await rq;
  for (const r of recipes ?? []) {
    const t = paramsToText(type, (r.params as Record<string, unknown>) ?? {});
    if (t) facts.push({ kind: "recipe", text: `your ${r.status === "cal" ? "calibrated" : r.status} recipe "${r.name}": ${t}` });
  }

  // Recent logged attempts (with outcome).
  let aq = supabase.from("attempts").select("outcome, params, note, process").eq("process", process).order("logged_at", { ascending: false }).limit(3);
  if (machineId) aq = aq.eq("machine_id", machineId);
  if (mat) aq = aq.ilike("material_name", `%${mat}%`);
  const { data: attempts } = await aq;
  for (const a of attempts ?? []) {
    const t = paramsToText(type, (a.params as Record<string, unknown>) ?? {});
    if (t) facts.push({ kind: "attempt", text: `logged attempt (${a.outcome}): ${t}${a.note ? ` — ${a.note}` : ""}` });
  }

  return facts;
}
