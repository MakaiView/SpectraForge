import { PARAM_DEFS } from "@/lib/params/schema";
import { goalMeta, type GoalKey } from "@/lib/calibration/constants";
import type { TestAxes, Grid, Grade, BestSquare } from "@/lib/calibration/engine";
import { resolveCell } from "@/lib/calibration/engine";
import type { GradeResult } from "@/lib/calibration/engine";

/**
 * Build the vision-grading prompt (BUILD_SPEC §5c). The model gets the burned
 * sheet photo (base64, inlined by the caller) plus the exact grid geometry so it
 * can align cells to axis values and grade each one for the goal.
 */
export function buildGradePrompt(axes: TestAxes, statics: Record<string, number>, goal: GoalKey, machineDesc: string, material: string, context = ""): { system: string; user: string } {
  const g = goalMeta(goal);
  const rows = axes.y.values.length;
  const cols = axes.x.values.length;
  const yd = PARAM_DEFS[axes.y.key];
  const xd = PARAM_DEFS[axes.x.key];
  const staticsStr = Object.entries(statics).map(([k, v]) => `${PARAM_DEFS[k as keyof typeof PARAM_DEFS]?.label ?? k}=${v}`).join(", ") || "none";

  const system =
    "You are a laser-materials calibration expert grading a physical test grid burned onto a sheet. " +
    "Grade ONLY from what the photo shows. Return STRICT JSON, no prose.";

  const user =
    `The photo is a ${rows}×${cols} laser test grid burned on ${machineDesc}, testing ${material || "an unspecified material"}.\n` +
    (context.trim() ? `The user's context / aim: ${context.trim()}\n` : "") +
    `Rows (top→bottom) vary ${yd.label} (${yd.unit}): [${axes.y.values.join(", ")}].\n` +
    `Columns (left→right) vary ${xd.label} (${xd.unit}): [${axes.x.values.join(", ")}].\n` +
    `Fixed settings on every cell: ${staticsStr}.\n` +
    `Goal: ${g.label} — ${g.sub}.\n\n` +
    `Grade each cell as exactly one of "great", "possible", "bad", or "fail" for that goal:\n` +
    `- great: exactly the result you want for this goal.\n` +
    `- possible: usable but not ideal — would do in a pinch.\n` +
    `- bad: it marked, but clearly wrong for the goal.\n` +
    `- fail: ruined — it burned through / destroyed the material, OR it barely marked at all.\n` +
    `If the best cell sits on an outer edge of the grid, say so in the writeup — the true optimum may lie beyond this grid; suggest widening the machine's range in Settings. ` +
    `In the writeup, note whether the failures skew too hot (over-burning) or too cold (under-marking). ` +
    `Return JSON exactly like: {"grades":[["great","possible",...] (${cols} per row, ${rows} rows)], ` +
    `"best":{"row":<0-${rows - 1}>,"col":<0-${cols - 1}>}, "headline":"<one line>", "writeup":"<2-3 sentences>"}.`;

  return { system, user };
}

const VALID: Grade[] = ["great", "possible", "bad", "fail", "ungraded"];

/**
 * Validate + convert a model grade response into the same GradeResult shape the
 * heuristic returns (grid keyed "row,col" + best + analysis). Returns null when
 * the JSON doesn't match the known grid geometry — the caller then falls back.
 */
export function parseGradeResponse(json: unknown, axes: TestAxes, statics: Record<string, number>): GradeResult | null {
  const rows = axes.y.values.length;
  const cols = axes.x.values.length;
  if (!json || typeof json !== "object") return null;
  const obj = json as { grades?: unknown; best?: unknown; headline?: unknown; writeup?: unknown };
  if (!Array.isArray(obj.grades) || obj.grades.length !== rows) return null;

  const grid: Grid = {};
  for (let r = 0; r < rows; r++) {
    const row = obj.grades[r];
    if (!Array.isArray(row) || row.length !== cols) return null;
    for (let c = 0; c < cols; c++) {
      const g = String(row[c]) as Grade;
      grid[`${r},${c}`] = VALID.includes(g) && g !== "ungraded" ? g : "ungraded";
    }
  }

  const b = obj.best as { row?: unknown; col?: unknown } | undefined;
  let bestRow = typeof b?.row === "number" ? b.row : 0;
  let bestCol = typeof b?.col === "number" ? b.col : 0;
  bestRow = Math.max(0, Math.min(rows - 1, Math.round(bestRow)));
  bestCol = Math.max(0, Math.min(cols - 1, Math.round(bestCol)));
  const best: BestSquare = { row: bestRow, col: bestCol, params: resolveCell(axes, statics, bestRow, bestCol) };

  const headline = typeof obj.headline === "string" && obj.headline ? obj.headline : "Graded from the sheet photo.";
  const writeup = typeof obj.writeup === "string" && obj.writeup ? obj.writeup : "";

  return { grid, best, analysis: { headline, writeup } };
}
