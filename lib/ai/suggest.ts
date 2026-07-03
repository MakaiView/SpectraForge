import { PARAM_DEFS, TYPE_PARAMS, type MachineTypeKey } from "@/lib/params/schema";
import { goalMeta, type GoalKey } from "@/lib/calibration/constants";
import { clampParams } from "@/lib/ai/constraints";
import type { Ranges } from "@/lib/calibration/engine";

/** A grounding fact retrieved from the user's own data / presets (RAG-lite). */
export interface GroundingFact {
  kind: "baseline" | "recipe" | "attempt";
  text: string;
}

/**
 * Build the suggested-starting-settings prompt (BUILD_SPEC §5c). RAG-lite:
 * grounds the model in the user's own promoted recipes, logged attempts, and
 * manufacturer baselines for this material/machine, and constrains it to the
 * machine's real ranges + the params this type exposes.
 */
export function buildSuggestPrompt(type: MachineTypeKey, ranges: Ranges, material: string, goal: GoalKey, grounding: GroundingFact[]): { system: string; user: string } {
  const g = goalMeta(goal);
  const paramList = TYPE_PARAMS[type]
    .map((k) => {
      const def = PARAM_DEFS[k];
      const r = ranges[k] ?? {};
      const range = def.kind === "count" ? `max ${r.max ?? "?"}` : `${r.min ?? "?"}–${r.max ?? "?"} ${def.unit}`;
      return `${k} (${def.label}, ${range})`;
    })
    .join("; ");
  const facts = grounding.length ? grounding.map((f) => `- [${f.kind}] ${f.text}`).join("\n") : "- (no prior data for this combination)";

  const system =
    "You are a laser-materials expert proposing STARTING settings to center a calibration test. " +
    "Ground every number in the provided facts and the machine's ranges; never exceed the ranges. Return STRICT JSON only.";

  const user =
    `Machine type: ${type}. Material: ${material || "unspecified"}. Goal: ${g.label} — ${g.sub}.\n` +
    `Applicable parameters and their ranges: ${paramList}.\n\n` +
    `Known facts to ground on:\n${facts}\n\n` +
    `Propose one starting parameter set (a value per applicable parameter, within range). ` +
    `Return JSON exactly like: {"params":{"${TYPE_PARAMS[type][0]}":<number>, ...}, "rationale":"<1-2 sentences>"}.`;

  return { system, user };
}

export interface SuggestResult {
  params: Record<string, number>;
  rationale: string;
}

/** Validate + clamp a suggest response. Returns null when no usable params. */
export function parseSuggestResponse(json: unknown, type: MachineTypeKey, ranges: Ranges): SuggestResult | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as { params?: unknown; rationale?: unknown };
  const rawParams = (obj.params && typeof obj.params === "object" ? obj.params : {}) as Record<string, unknown>;
  const params = clampParams(type, ranges, rawParams);
  if (Object.keys(params).length === 0) return null;
  return { params, rationale: typeof obj.rationale === "string" ? obj.rationale : "" };
}
