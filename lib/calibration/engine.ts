import { PARAM_DEFS, type ParamKey, type MachineTypeKey } from "@/lib/params/schema";
import {
  patternAxisKeys,
  primaryParam,
  ENERGY_DIR,
  GOAL_TARGET_ENERGY,
  type PatternKey,
  type GoalKey,
} from "@/lib/calibration/constants";

export type Grade = "ungraded" | "clean" | "partial" | "fail";
export const DEFAULT_GRID = 5;

export interface Axis {
  key: ParamKey;
  values: number[];
}
export interface TestAxes {
  x: Axis;
  y: Axis;
}
export type Ranges = Record<string, { min?: number | null; max?: number | null }>;
/** grid cells keyed by "row,col" → grade. Row 0 is the TOP row (high energy). */
export type Grid = Record<string, Grade>;

export interface BestSquare {
  row: number;
  col: number;
  params: Record<string, number>;
}

// ── Nice numbers ─────────────────────────────────────────────────────────────

/** Round a raw step up to a "nice" round number (1, 2, 2.5, 5 × 10^k) so axis
 *  values stay usable in LightBurn (BUILD_SPEC §8, DATA_MODEL niceStep). */
export function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / mag;
  const nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 4 ? 2.5 : f < 7 ? 5 : 10;
  return nf * mag;
}

function decimalsForStep(step: number): number {
  return step < 1 ? Math.min(3, Math.ceil(-Math.log10(step))) : 0;
}
function roundTo(v: number, decimals: number): number {
  const m = Math.pow(10, decimals);
  return Math.round(v * m) / m;
}

/** True when every axis value equals its nice-snapped form (the round-guard). */
export function axisIsRound(axis: Axis): boolean {
  if (axis.values.length < 2) return true;
  const step = axis.values[1] - axis.values[0];
  const d = decimalsForStep(niceStep(Math.abs(step)) || 1);
  return axis.values.every((v) => roundTo(v, d) === v);
}

// ── Axis building ────────────────────────────────────────────────────────────

/** Build a range axis of `count` nice values across [min,max], optionally
 *  centered on `center` with a given step (for refine). */
export function buildRangeAxis(key: ParamKey, min: number, max: number, count: number, center?: number, step?: number): Axis {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  let s = step ?? niceStep((hi - lo) / (count - 1 || 1));
  if (s <= 0) s = 1;
  const d = decimalsForStep(s);
  let start: number;
  if (center == null) start = lo;
  else start = center - (s * (count - 1)) / 2;
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    let v = start + i * s;
    v = Math.min(hi, Math.max(lo, v));
    values.push(roundTo(v, d));
  }
  return { key, values };
}

/** Build the passes axis (integers 1..min(count,max)). */
export function buildPassesAxis(max: number, count: number): Axis {
  const n = Math.max(1, Math.min(count, Math.floor(max) || count));
  return { key: "passes", values: Array.from({ length: n }, (_, i) => i + 1) };
}

function axisFor(key: ParamKey, ranges: Ranges, count: number, center?: number, step?: number): Axis {
  if (key === "passes") return buildPassesAxis(ranges.passes?.max ?? count, count);
  const r = ranges[key] ?? {};
  const min = r.min ?? 0;
  const max = r.max ?? (r.min != null ? r.min + count : count);
  return buildRangeAxis(key, min, max, count, center, step);
}

/**
 * Build a test's axes from the machine ranges + pattern. y is the primary
 * (energy) axis rendered HIGH→LOW top-to-bottom; x sweeps left→right. `centers`
 * (from a previous best square) narrows the window for a refine; `steps` gives
 * a finer step per axis.
 */
export function buildAxes(
  type: MachineTypeKey,
  pattern: PatternKey,
  ranges: Ranges,
  count: number,
  centers?: Partial<Record<ParamKey, number>>,
  steps?: Partial<Record<ParamKey, number>>
): TestAxes | null {
  const keys = patternAxisKeys(type, pattern);
  if (!keys) return null;
  const x = axisFor(keys.x, ranges, count, centers?.[keys.x], steps?.[keys.x]);
  const yRaw = axisFor(keys.y, ranges, count, centers?.[keys.y], steps?.[keys.y]);
  // y descends so the highest-energy row is on top.
  const y: Axis = { key: yRaw.key, values: [...yRaw.values].sort((a, b) => b - a) };
  return { x, y };
}

// ── Grid resolution ──────────────────────────────────────────────────────────

export function emptyGrid(rows: number, cols: number): Grid {
  const g: Grid = {};
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) g[`${r},${c}`] = "ungraded";
  return g;
}

/** Resolve a cell's full parameter set: its x & y axis values + the statics. */
export function resolveCell(axes: TestAxes, statics: Record<string, number>, row: number, col: number): Record<string, number> {
  return { ...statics, [axes.y.key]: axes.y.values[row], [axes.x.key]: axes.x.values[col] };
}

// ── Heuristic grader (placeholder — Phase 6 replaces with a vision model) ─────

function norm(values: number[], v: number): number {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return hi === lo ? 0.5 : (v - lo) / (hi - lo);
}

/** Normalized 0..1 "energy" for a cell from its two axis params + directions. */
function cellEnergy(axes: TestAxes, row: number, col: number): number {
  const contribs: { w: number; c: number }[] = [];
  const add = (key: ParamKey, values: number[], val: number) => {
    const dir = ENERGY_DIR[key] ?? 0;
    if (dir === 0) return;
    const n = norm(values, val);
    contribs.push({ w: Math.abs(dir), c: dir > 0 ? n : 1 - n });
  };
  add(axes.y.key, axes.y.values, axes.y.values[row]);
  add(axes.x.key, axes.x.values, axes.x.values[col]);
  const wSum = contribs.reduce((s, x) => s + x.w, 0) || 1;
  return contribs.reduce((s, x) => s + x.w * x.c, 0) / wSum;
}

export interface GradeResult {
  grid: Grid;
  best: BestSquare;
  analysis: { headline: string; writeup: string };
}

/**
 * Grade every cell against the goal's target energy and pick the recommended
 * square. THIS IS A HEURISTIC that ignores the sheet photo's pixels — it is the
 * explicit stand-in for the real vision model (BUILD_SPEC §5c). Same shape the
 * Phase-6 server route will return, so swapping it is local.
 */
export function heuristicGrade(axes: TestAxes, statics: Record<string, number>, goal: GoalKey): GradeResult {
  const rows = axes.y.values.length;
  const cols = axes.x.values.length;
  const target = GOAL_TARGET_ENERGY[goal];
  const grid: Grid = {};
  let best: BestSquare | null = null;
  let bestDelta = Infinity;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const e = cellEnergy(axes, r, c);
      const delta = Math.abs(e - target);
      grid[`${r},${c}`] = delta < 0.12 ? "clean" : delta < 0.28 ? "partial" : "fail";
      if (delta < bestDelta) {
        bestDelta = delta;
        best = { row: r, col: c, params: resolveCell(axes, statics, r, c) };
      }
    }
  }

  const b = best!;
  const yDef = PARAM_DEFS[axes.y.key];
  const xDef = PARAM_DEFS[axes.x.key];
  const cleanN = Object.values(grid).filter((g) => g === "clean").length;
  const headline = `${cleanN} clean square${cleanN === 1 ? "" : "s"} — best at ${yDef.short} ${b.params[axes.y.key]}, ${xDef.short} ${b.params[axes.x.key]}`;
  const writeup =
    `The grid sweeps ${yDef.label} (rows) against ${xDef.label} (columns). ` +
    `For a ${goal} goal the sweet spot sits toward ${target > 0.6 ? "higher" : target < 0.4 ? "lower" : "mid"} energy — ` +
    `${yDef.label} ${b.params[axes.y.key]} at ${xDef.label} ${b.params[axes.x.key]} lands closest. ` +
    `Refine around that square for a finer pass, or promote it to a recipe.`;

  return { grid, best: b, analysis: { headline, writeup } };
}

// ── Refine ───────────────────────────────────────────────────────────────────

/** Build the next (finer) test centered on the current best square, halving
 *  each axis step. Returns axes + reset grid. */
export function refineAxes(type: MachineTypeKey, pattern: PatternKey, ranges: Ranges, prev: TestAxes, best: BestSquare, count: number): TestAxes | null {
  const centers: Partial<Record<ParamKey, number>> = {
    [prev.x.key]: best.params[prev.x.key],
    [prev.y.key]: best.params[prev.y.key],
  };
  const stepOf = (a: Axis) => Math.abs((a.values[1] ?? a.values[0]) - a.values[0]) || undefined;
  const steps: Partial<Record<ParamKey, number>> = {};
  const sx = stepOf(prev.x);
  const sy = stepOf(prev.y);
  if (sx && prev.x.key !== "passes") steps[prev.x.key] = niceStep(sx / 2);
  if (sy && prev.y.key !== "passes") steps[prev.y.key] = niceStep(sy / 2);
  return buildAxes(type, pattern, ranges, count, centers, steps);
}

// ── LightBurn Material Test handoff ──────────────────────────────────────────

export interface LightburnMap {
  xLabel: string;
  xMin: number;
  xMax: number;
  cols: number;
  yLabel: string;
  yMin: number;
  yMax: number;
  rows: number;
}

/** Map a test's axes to LightBurn's Material Test wizard fields (X/Y Min/Max/Cols). */
export function lightburnMap(axes: TestAxes): LightburnMap {
  return {
    xLabel: PARAM_DEFS[axes.x.key].label,
    xMin: Math.min(...axes.x.values),
    xMax: Math.max(...axes.x.values),
    cols: axes.x.values.length,
    yLabel: PARAM_DEFS[axes.y.key].label,
    yMin: Math.min(...axes.y.values),
    yMax: Math.max(...axes.y.values),
    rows: axes.y.values.length,
  };
}
