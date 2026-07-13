import { PARAM_DEFS, TYPE_PARAMS, formatParam, type MachineTypeKey, type ParamKey } from "@/lib/params/schema";
import type { GroundingFact } from "@/lib/ai/suggest";
import type { ResultGrade } from "@/lib/calibration/grades";

export interface AttemptContext {
  machineDesc: string;
  type: MachineTypeKey;
  material: string;
  process: "cut" | "engrave" | "mark";
  outcome: ResultGrade;
  params: Record<string, number>;
  note: string;
  hasInput: boolean;
  hasResult: boolean;
}

function paramsToText(type: MachineTypeKey, params: Record<string, number>): string {
  return TYPE_PARAMS[type]
    .map((k) => (typeof params[k] === "number" ? `${PARAM_DEFS[k as ParamKey].label} ${formatParam(k, params[k])}` : null))
    .filter(Boolean)
    .join(", ") || "none recorded";
}

/**
 * Build the attempt-advice prompt (BUILD_SPEC §5). The model gets the design
 * (input) and burn (result) photos plus the full run context — machine, material,
 * process, the exact settings used, the outcome the user recorded, their note,
 * and grounding facts from their own data — and returns a diagnosis + concrete
 * next-setting changes. Advice is textual (natural-language changes), not a param
 * set to auto-apply, so it isn't range-clamped.
 */
export function buildAdvisePrompt(ctx: AttemptContext, grounding: GroundingFact[]): { system: string; user: string } {
  const settings = paramsToText(ctx.type, ctx.params);
  const facts = grounding.length ? grounding.map((f) => `- [${f.kind}] ${f.text}`).join("\n") : "- (no prior data for this combination)";
  const photos =
    ctx.hasInput && ctx.hasResult
      ? "Two photos are attached: first the intended design (input), then the actual burn (result). Compare them."
      : ctx.hasResult
        ? "One photo is attached: the actual burn (result)."
        : ctx.hasInput
          ? "One photo is attached: the intended design (input)."
          : "No photos are attached — reason from the settings and outcome alone.";

  const aim =
    ctx.outcome === "great"
      ? "The user marked this GREAT. Confirm what's working and offer at most one optional optimization (e.g. faster/fewer passes) — do not fix what isn't broken."
      : ctx.outcome === "possible"
        ? "The user marked this POSSIBLE (usable but not ideal). Diagnose what's holding it back and propose the smallest setting changes to make it great."
        : ctx.outcome === "bad"
          ? "The user marked this BAD (it marked, but clearly wrong for the goal). Diagnose the main problem and propose the setting changes to fix it."
          : "The user marked this a FAIL — it either burned through / destroyed the material, or barely marked at all. Say which of the two it looks like, then propose the setting changes most likely to fix it.";

  const system =
    "You are a laser-materials expert reviewing a single real burn attempt. Judge from the photo(s) and the recorded context. " +
    "Give specific, actionable parameter changes for THIS machine's parameters — direction and rough magnitude — not generic advice. Return STRICT JSON only, no prose.";

  const user =
    `${photos}\n` +
    `Machine: ${ctx.machineDesc}. Material: ${ctx.material || "unspecified"}. Process: ${ctx.process}.\n` +
    `Settings used: ${settings}.\n` +
    `Recorded outcome: ${ctx.outcome}.${ctx.note ? ` User note: "${ctx.note}".` : ""}\n` +
    `${aim}\n\n` +
    `Known facts to ground on:\n${facts}\n\n` +
    `Return JSON exactly like: {"summary":"<1-2 sentence read of the result>", ` +
    `"cause":"<likely cause, or empty string if clean>", ` +
    `"suggestions":[{"change":"<concrete change, e.g. 'Lower speed ~20% to 1500 mm/s'>","why":"<short reason>"}], ` +
    `"confidence":"low"|"medium"|"high"}.`;

  return { system, user };
}

export interface Advice {
  summary: string;
  cause: string;
  suggestions: { change: string; why: string }[];
  confidence: "low" | "medium" | "high";
  at: string;
  model?: string;
}

const CONF = new Set(["low", "medium", "high"]);

/** Validate + normalize a model advice response. Returns null when unusable. */
export function parseAdviceResponse(json: unknown): Omit<Advice, "at" | "model"> | null {
  if (!json || typeof json !== "object") return null;
  const o = json as { summary?: unknown; cause?: unknown; suggestions?: unknown; confidence?: unknown };
  const summary = typeof o.summary === "string" ? o.summary.trim() : "";
  const suggestions = Array.isArray(o.suggestions)
    ? o.suggestions
        .map((s) => {
          const so = (s ?? {}) as { change?: unknown; why?: unknown };
          return { change: typeof so.change === "string" ? so.change.trim() : "", why: typeof so.why === "string" ? so.why.trim() : "" };
        })
        .filter((s) => s.change)
        .slice(0, 6)
    : [];
  if (!summary && suggestions.length === 0) return null;
  const confidence = (typeof o.confidence === "string" && CONF.has(o.confidence) ? o.confidence : "medium") as Advice["confidence"];
  return { summary: summary || "Reviewed the attempt.", cause: typeof o.cause === "string" ? o.cause.trim() : "", suggestions, confidence };
}
