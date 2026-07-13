import { PARAM_DEFS, TYPE_PARAMS, formatParam, type MachineTypeKey, type ParamKey } from "@/lib/params/schema";
import { goalMeta, applicablePatterns, patternAxisKeys, primaryParam, type GoalKey, type PatternKey } from "@/lib/calibration/constants";
import type { TestAxes, Grid, BestSquare, Ranges } from "@/lib/calibration/engine";

export interface NextTestContext {
  machineDesc: string;
  type: MachineTypeKey;
  material: string;
  goal: GoalKey;
  context: string;
  axes: TestAxes;
  statics: Record<string, number>;
  grid: Grid;
  best: BestSquare | null;
  rationale: string;
  ranges: Ranges;
}

function gradesMatrix(axes: TestAxes, grid: Grid): string {
  const rows = axes.y.values.length;
  const cols = axes.x.values.length;
  const yShort = PARAM_DEFS[axes.y.key].short;
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    const cells: string[] = [];
    for (let c = 0; c < cols; c++) cells.push(grid[`${r},${c}`] ?? "ungraded");
    lines.push(`  ${yShort} ${axes.y.values[r]}: ${cells.join(", ")}`);
  }
  return lines.join("\n");
}

/**
 * Build the "plan the next test" prompt (BUILD_SPEC §5c). The model gets the last
 * grid's axes + the user's per-cell grades + their winner + their rationale + the
 * run context, then reasons about what's limiting the result and proposes the
 * next grid — it MAY sweep different parameters and re-center the held values.
 * Constrained to the machine's ranges (the server re-clamps regardless).
 */
export function buildNextTestPrompt(ctx: NextTestContext): { system: string; user: string } {
  const g = goalMeta(ctx.goal);
  const primary = primaryParam(ctx.type);
  const staticsStr =
    Object.entries(ctx.statics)
      .filter(([k]) => k in PARAM_DEFS)
      .map(([k, v]) => `${PARAM_DEFS[k as ParamKey].label}=${formatParam(k as ParamKey, v)}`)
      .join(", ") || "none";
  const bestStr = ctx.best
    ? TYPE_PARAMS[ctx.type].map((k) => (ctx.best!.params[k] != null ? `${PARAM_DEFS[k].short} ${formatParam(k, ctx.best!.params[k])}` : null)).filter(Boolean).join(", ")
    : "not picked";
  const opts = applicablePatterns(ctx.type)
    .map((p) => {
      const ax = patternAxisKeys(ctx.type, p.key)!;
      return `"${p.key}" → sweep ${PARAM_DEFS[ax.x].label} on X`;
    })
    .join("; ");
  const rangesStr = TYPE_PARAMS[ctx.type]
    .map((k) => {
      const r = ctx.ranges[k] ?? {};
      const def = PARAM_DEFS[k];
      return def.kind === "count" ? `${k} (${def.label}): 1–${r.max ?? "?"}` : `${k} (${def.label}): ${r.min ?? "?"}–${r.max ?? "?"} ${def.unit}`;
    })
    .join("; ");

  const system =
    "You are a laser-materials calibration expert planning the NEXT test grid to converge on the goal. " +
    "Study the last grid's grades and the user's notes, reason about what is LIMITING the result, then propose the next grid. " +
    "You MAY sweep DIFFERENT parameters than the last grid and re-center the held (static) values to attack the real limiting factor — don't just zoom in if a different setting is the problem. " +
    "Never exceed the machine's ranges. Return STRICT JSON only, no prose.";

  const user =
    `Machine: ${ctx.machineDesc}. Material: ${ctx.material || "unspecified"}. Goal: ${g.label} — ${g.sub}.\n` +
    (ctx.context.trim() ? `Context / aim: ${ctx.context.trim()}\n` : "") +
    `\nThe last grid swept ${PARAM_DEFS[ctx.axes.y.key].label} (rows, high→low) × ${PARAM_DEFS[ctx.axes.x.key].label} (columns).\n` +
    `Held constant: ${staticsStr}.\n` +
    `The user's grades — great = ideal, possible = usable, bad = marked but wrong, fail = destroyed OR barely marked:\n${gradesMatrix(ctx.axes, ctx.grid)}\n` +
    `The user's picked winner: ${bestStr}.\n` +
    (ctx.rationale.trim() ? `The user's notes on their grading: "${ctx.rationale.trim()}"\n` : "") +
    `\nSweep options for the next grid — choose one "pattern" (Y is always ${PARAM_DEFS[primary].label}): ${opts}.\n` +
    `Machine parameter ranges (never exceed): ${rangesStr}.\n\n` +
    `Propose the next test. Return JSON exactly like: {"pattern":"<key>","yMin":<n>,"yMax":<n>,"xMin":<n>,"xMax":<n>,` +
    `"statics":{"<param>":<n>,...},"reasoning":"<1-2 sentences: what you changed vs the last grid and why>"}. ` +
    `yMin/yMax bound the Y axis (${PARAM_DEFS[primary].label}); xMin/xMax bound the swept X parameter of the chosen pattern; ` +
    `"statics" gives a value for every OTHER applicable parameter. Keep every number within the machine ranges above.`;

  return { system, user };
}

export interface NextTestPlan {
  pattern: PatternKey;
  yMin: number;
  yMax: number;
  xMin: number;
  xMax: number;
  statics: Record<string, number>;
  reasoning: string;
}

const numOr = (v: unknown, d: number) => (typeof v === "number" && !Number.isNaN(v) ? v : d);

/** Validate a next-test response. Returns null when the pattern isn't usable. */
export function parseNextTestResponse(json: unknown, type: MachineTypeKey): NextTestPlan | null {
  if (!json || typeof json !== "object") return null;
  const o = json as { pattern?: unknown; yMin?: unknown; yMax?: unknown; xMin?: unknown; xMax?: unknown; statics?: unknown; reasoning?: unknown };
  const pattern = String(o.pattern) as PatternKey;
  if (!applicablePatterns(type).some((p) => p.key === pattern)) return null;
  if (![o.yMin, o.yMax, o.xMin, o.xMax].every((n) => typeof n === "number")) return null;
  const rawStatics = (o.statics && typeof o.statics === "object" ? o.statics : {}) as Record<string, unknown>;
  const statics: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawStatics)) if (typeof v === "number" && !Number.isNaN(v)) statics[k] = v;
  return {
    pattern,
    yMin: numOr(o.yMin, 0),
    yMax: numOr(o.yMax, 0),
    xMin: numOr(o.xMin, 0),
    xMax: numOr(o.xMax, 0),
    statics,
    reasoning: typeof o.reasoning === "string" ? o.reasoning.trim() : "",
  };
}
