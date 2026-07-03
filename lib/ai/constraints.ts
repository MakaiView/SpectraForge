import { PARAM_DEFS, TYPE_PARAMS, type MachineTypeKey } from "@/lib/params/schema";
import type { Ranges } from "@/lib/calibration/engine";

/**
 * Hard constraints (BUILD_SPEC §5b): clamp any model-generated parameter set to
 * (1) only the params this machine type exposes, and (2) the machine's physical
 * ranges. A general model understands the concepts but hallucinates specific
 * numbers — these guardrails make an unsafe suggestion impossible to surface.
 */
export function clampParams(type: MachineTypeKey, ranges: Ranges, raw: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of TYPE_PARAMS[type]) {
    const v = raw[key];
    if (typeof v !== "number" || Number.isNaN(v)) continue;
    const def = PARAM_DEFS[key];
    const r = ranges[key] ?? {};
    let clamped = v;
    if (r.min != null) clamped = Math.max(r.min, clamped);
    if (r.max != null) clamped = Math.min(r.max, clamped);
    if (def.kind === "count") clamped = Math.max(1, Math.round(clamped));
    else clamped = Math.round(clamped * Math.pow(10, def.decimals)) / Math.pow(10, def.decimals);
    out[key] = clamped;
  }
  return out;
}

/** True when a param set has at least one applicable value for the type. */
export function hasAnyParam(type: MachineTypeKey, params: Record<string, number>): boolean {
  return TYPE_PARAMS[type].some((k) => typeof params[k] === "number");
}
