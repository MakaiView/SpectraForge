"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/db";
import { TYPE_PARAMS, type MachineTypeKey, type ParamKey } from "@/lib/params/schema";
import { defaultPattern, goalMeta, patternAxisKeys, type GoalKey, type PatternKey } from "@/lib/calibration/constants";
import { buildAxes, refineAxes, heuristicGrade, emptyGrid, resolveCell, DEFAULT_GRID, type TestAxes, type Ranges, type Grid, type BestSquare, type GradeResult } from "@/lib/calibration/engine";
import { isAiConfigured } from "@/lib/ai/config";
import { chat, extractJson } from "@/lib/ai/provider";
import { buildGradePrompt, parseGradeResponse } from "@/lib/ai/grade";
import { buildSuggestPrompt, parseSuggestResponse } from "@/lib/ai/suggest";
import { getGrounding } from "@/lib/ai/grounding";
import { buildNextTestPrompt, parseNextTestResponse } from "@/lib/ai/nexttest";
import { machineContext, type MachineInfo } from "@/lib/ai/context";
import { objectToModelBase64 } from "@/lib/images/forModel";
import { clampParams } from "@/lib/ai/constraints";
import { CALIBRATION_BUCKET } from "@/lib/storage/photos";

export type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function getMachine(supabase: Awaited<ReturnType<typeof createClient>>, machineId: string) {
  const { data } = await supabase.from("machines").select("id, name, manufacturer, model, type, watts, lens, ranges").eq("id", machineId).single();
  return data as
    | { id: string; name: string; manufacturer: string; model: string; type: MachineTypeKey; watts: number; lens: string; ranges: Ranges }
    | null;
}

/** Non-axis params get a static value: from the baseline if present, else the
 *  midpoint of the machine's range (1 for passes). */
function computeStatics(type: MachineTypeKey, ranges: Ranges, axisKeys: Set<string>, baseline?: Record<string, number> | null): Record<string, number> {
  const statics: Record<string, number> = {};
  for (const key of TYPE_PARAMS[type]) {
    if (axisKeys.has(key)) continue;
    if (baseline && baseline[key] != null) { statics[key] = baseline[key]; continue; }
    if (key === "passes") { statics[key] = 1; continue; }
    const r = ranges[key] ?? {};
    if (r.min != null && r.max != null) statics[key] = Math.round(((r.min + r.max) / 2) * 1000) / 1000;
  }
  return statics;
}

function rows(axes: TestAxes) { return axes.y.values.length; }
function cols(axes: TestAxes) { return axes.x.values.length; }

export interface CreateRunInput {
  materialId: string | null;
  materialName: string;
  machineId: string;
  goal: GoalKey;
  /** Free-text: what the material is + what the user is going for (feeds the AI). */
  context?: string;
  /** Optional manufacturer/preset params to center the first grid on (§6). */
  baseline?: Record<string, number> | null;
}

export async function createRun(input: CreateRunInput): Promise<Result<{ runId: string }>> {
  const supabase = await createClient();
  const machine = await getMachine(supabase, input.machineId);
  if (!machine) return { ok: false, error: "Pick a machine to calibrate." };

  const pattern = defaultPattern(machine.type, input.goal);
  let axes = buildAxes(machine.type, pattern, machine.ranges, DEFAULT_GRID);
  if (!axes) return { ok: false, error: "This machine type has no applicable test pattern." };
  // Center the first grid on the baseline when provided.
  if (input.baseline) {
    const centers = { [axes.x.key]: input.baseline[axes.x.key], [axes.y.key]: input.baseline[axes.y.key] };
    const centered = buildAxes(machine.type, pattern, machine.ranges, DEFAULT_GRID, centers);
    if (centered) axes = centered;
  }
  const statics = computeStatics(machine.type, machine.ranges, new Set([axes.x.key, axes.y.key]), input.baseline ?? null);

  const name = `${input.materialName || "Material"} — ${goalMeta(input.goal).label}`;
  const { data: run, error: runErr } = await supabase
    .from("calibration_runs")
    .insert({ name, material_id: input.materialId, material_name: input.materialName, machine_id: input.machineId, goal: input.goal, context: (input.context ?? "").trim(), baseline: (input.baseline ?? null) as unknown as Json })
    .select("id")
    .single();
  if (runErr || !run) return { ok: false, error: "Could not create the run." };

  const { error: testErr } = await supabase.from("calibration_tests").insert({
    run_id: run.id,
    idx: 1,
    pattern,
    axes: axes as unknown as Json,
    statics,
    grid: emptyGrid(rows(axes), cols(axes)) as unknown as Json,
  });
  if (testErr) return { ok: false, error: "Could not build the first test." };

  revalidatePath("/calibration");
  return { ok: true, data: { runId: run.id } };
}

/** Rebuild a test's axes for a new pattern/count, resetting its grid. */
export async function updateTestConfig(testId: string, pattern: PatternKey, count: number): Promise<Result> {
  const supabase = await createClient();
  const { data: test } = await supabase.from("calibration_tests").select("id, run_id, calibration_runs(machine_id)").eq("id", testId).single();
  if (!test) return { ok: false, error: "Test not found." };
  const machineId = (test.calibration_runs as { machine_id: string } | null)?.machine_id;
  if (!machineId) return { ok: false, error: "Run has no machine." };
  const machine = await getMachine(supabase, machineId);
  if (!machine) return { ok: false, error: "Machine not found." };

  const n = Math.max(3, Math.min(9, count || DEFAULT_GRID));
  const axes = buildAxes(machine.type, pattern, machine.ranges, n);
  if (!axes) return { ok: false, error: "That pattern isn't applicable to this machine type." };
  const statics = computeStatics(machine.type, machine.ranges, new Set([axes.x.key, axes.y.key]));

  const { error } = await supabase
    .from("calibration_tests")
    .update({ pattern, axes: axes as unknown as Json, statics, grid: emptyGrid(rows(axes), cols(axes)) as unknown as Json, best_square: null, analysis: null })
    .eq("id", testId);
  if (error) return { ok: false, error: "Could not update the test." };
  revalidatePath(`/calibration/${test.run_id}`);
  return { ok: true };
}

/** Persist manual grid edits + chosen best square. */
export async function saveGrid(testId: string, grid: Grid, best: BestSquare | null): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("calibration_tests").update({ grid: grid as unknown as Json, best_square: best as unknown as Json }).eq("id", testId);
  if (error) return { ok: false, error: "Could not save grades." };
  return { ok: true };
}

/** Save the human's rationale for how they graded a test (training signal). */
export async function saveRationale(testId: string, rationale: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("calibration_tests").update({ rationale: rationale }).eq("id", testId);
  if (error) return { ok: false, error: "Could not save the rationale." };
  return { ok: true };
}

/**
 * "AI grade this sheet" — HEURISTIC placeholder (BUILD_SPEC §5c). Reads the
 * test's axes/statics + the run's goal, grades every cell and picks the
 * recommended square, and persists it. Phase 6 swaps the heuristic call for the
 * vision model here; the return shape stays the same.
 */
export async function gradeSheet(testId: string): Promise<Result<{ source: "vision" | "heuristic" }>> {
  const supabase = await createClient();
  const { data: test } = await supabase
    .from("calibration_tests")
    .select("id, run_id, axes, statics, photo_path, calibration_runs(goal, material_name, context, machines(name, manufacturer, model, type, watts, lens))")
    .eq("id", testId)
    .single();
  if (!test) return { ok: false, error: "Test not found." };
  const run = test.calibration_runs as { goal: string; material_name: string; context: string; machines: MachineInfo | null } | null;
  const goal = run?.goal as GoalKey;
  const axes = test.axes as unknown as TestAxes;
  const statics = (test.statics as Record<string, number>) ?? {};

  // Vision path when configured AND a sheet photo exists (§5c); else heuristic.
  let result: GradeResult | null = null;
  let source: "vision" | "heuristic" = "heuristic";
  if ((await isAiConfigured()) && test.photo_path) {
    const b64 = await objectToModelBase64(CALIBRATION_BUCKET, test.photo_path);
    if (b64) {
      const machineDesc = run?.machines ? machineContext(run.machines) : "an unspecified laser";
      const { system, user } = buildGradePrompt(axes, statics, goal, machineDesc, run?.material_name ?? "", run?.context ?? "");
      const res = await chat({ system, user, images: [b64], json: true, timeoutMs: 90000 });
      if (res.ok) {
        const parsed = parseGradeResponse(extractJson(res.content), axes, statics);
        if (parsed) { result = parsed; source = "vision"; }
      }
    }
  }
  if (!result) result = heuristicGrade(axes, statics, goal);
  const { grid, best, analysis } = result;

  // Write to the AI columns — never the human's grid/best_square (they grade blind).
  const { error } = await supabase
    .from("calibration_tests")
    .update({ ai_grid: grid as unknown as Json, ai_best: best as unknown as Json, analysis })
    .eq("id", testId);
  if (error) return { ok: false, error: "Could not grade the sheet." };
  await supabase.from("calibration_runs").update({ updated_at: new Date().toISOString() }).eq("id", test.run_id);
  revalidatePath(`/calibration/${test.run_id}`);
  return { ok: true, data: { source } };
}

/** Append the next, finer test centered on the last test's best square. */
export async function refineRun(runId: string): Promise<Result<{ testIdx: number }>> {
  const supabase = await createClient();
  const { data: run } = await supabase.from("calibration_runs").select("id, machine_id").eq("id", runId).single();
  if (!run?.machine_id) return { ok: false, error: "Run has no machine." };
  const machine = await getMachine(supabase, run.machine_id);
  if (!machine) return { ok: false, error: "Machine not found." };

  const { data: last } = await supabase.from("calibration_tests").select("*").eq("run_id", runId).order("idx", { ascending: false }).limit(1).single();
  if (!last) return { ok: false, error: "No test to refine." };
  const best = last.best_square as BestSquare | null;
  if (!best) return { ok: false, error: "Grade this test and pick a best square first." };

  const prevAxes = last.axes as unknown as TestAxes;
  const count = prevAxes.x.values.length;
  const axes = refineAxes(machine.type, last.pattern as PatternKey, machine.ranges, prevAxes, best, count);
  if (!axes) return { ok: false, error: "Could not refine." };
  const statics = { ...(last.statics as Record<string, number>) };

  const { error } = await supabase.from("calibration_tests").insert({
    run_id: runId,
    idx: last.idx + 1,
    pattern: last.pattern,
    axes: axes as unknown as Json,
    statics,
    grid: emptyGrid(axes.y.values.length, axes.x.values.length) as unknown as Json,
  });
  if (error) return { ok: false, error: "Could not create the refined test." };
  await supabase.from("calibration_runs").update({ updated_at: new Date().toISOString() }).eq("id", runId);
  revalidatePath(`/calibration/${runId}`);
  return { ok: true, data: { testIdx: last.idx + 1 } };
}

/**
 * AI-planned next test (BUILD_SPEC §5c). Unlike refineRun's mechanical zoom, this
 * feeds the model the last grid's grades + the user's rationale + run context, and
 * lets it reason about the limiting factor — it MAY sweep different parameters and
 * re-center the held values. Everything is re-clamped to the machine's ranges.
 * AI-only (there's no useful heuristic for open-ended "what should change next").
 */
export async function suggestNextTest(runId: string): Promise<Result<{ testIdx: number; reasoning: string }>> {
  const supabase = await createClient();
  if (!(await isAiConfigured())) return { ok: false, error: "Set up the AI assistant in Settings to get a reasoned next test." };

  const { data: run } = await supabase
    .from("calibration_runs")
    .select("id, machine_id, material_name, goal, context, machines(name, manufacturer, model, type, watts, lens, ranges)")
    .eq("id", runId)
    .single();
  if (!run?.machine_id) return { ok: false, error: "Run has no machine." };
  const machine = run.machines as (MachineInfo & { ranges: Ranges }) | null;
  if (!machine) return { ok: false, error: "Machine not found." };
  const type = machine.type as MachineTypeKey;
  const ranges = (machine.ranges ?? {}) as Ranges;

  const { data: last } = await supabase.from("calibration_tests").select("*").eq("run_id", runId).order("idx", { ascending: false }).limit(1).single();
  if (!last) return { ok: false, error: "No test to build on." };
  const humanGrid = ((last.grid as unknown as Grid) ?? {});
  if (Object.values(humanGrid).every((gr) => !gr || gr === "ungraded")) return { ok: false, error: "Grade this test first — the AI plans the next one from your grades." };

  const { system, user } = buildNextTestPrompt({
    machineDesc: machineContext(machine),
    type,
    material: run.material_name,
    goal: run.goal as GoalKey,
    context: run.context ?? "",
    axes: last.axes as unknown as TestAxes,
    statics: (last.statics as Record<string, number>) ?? {},
    grid: humanGrid,
    best: last.best_square as BestSquare | null,
    rationale: last.rationale ?? "",
    ranges,
  });
  const res = await chat({ system, user, json: true, timeoutMs: 45000 });
  if (!res.ok) return { ok: false, error: res.error };
  const plan = parseNextTestResponse(extractJson(res.content), type);
  if (!plan) return { ok: false, error: "The model's plan couldn't be read. Try again." };

  const keys = patternAxisKeys(type, plan.pattern);
  if (!keys) return { ok: false, error: "The suggested pattern isn't valid for this machine." };
  const clampWindow = (key: ParamKey, lo: number, hi: number) => {
    const r = ranges[key] ?? {};
    const min = r.min ?? Math.min(lo, hi);
    const max = r.max ?? Math.max(lo, hi);
    return { min: Math.max(min, Math.min(lo, hi)), max: Math.min(max, Math.max(lo, hi)) };
  };
  const overrideRanges: Ranges = { ...ranges, [keys.x]: clampWindow(keys.x, plan.xMin, plan.xMax), [keys.y]: clampWindow(keys.y, plan.yMin, plan.yMax) };
  const count = (last.axes as unknown as TestAxes)?.x?.values.length || DEFAULT_GRID;
  const axes = buildAxes(type, plan.pattern, overrideRanges, count);
  if (!axes) return { ok: false, error: "Could not build the next test grid." };

  // Held params: the AI's values, clamped to type + ranges; fill gaps from winner / last test.
  const clampedStatics = clampParams(type, ranges, plan.statics);
  const statics: Record<string, number> = {};
  for (const k of TYPE_PARAMS[type].filter((p) => p !== axes.x.key && p !== axes.y.key)) {
    const v = clampedStatics[k] ?? (last.best_square as BestSquare | null)?.params[k] ?? (last.statics as Record<string, number>)?.[k];
    if (typeof v === "number") statics[k] = v;
  }

  const { error } = await supabase.from("calibration_tests").insert({
    run_id: runId,
    idx: last.idx + 1,
    pattern: plan.pattern,
    axes: axes as unknown as Json,
    statics,
    grid: emptyGrid(axes.y.values.length, axes.x.values.length) as unknown as Json,
    ai_plan: plan.reasoning,
  });
  if (error) return { ok: false, error: "Could not create the next test." };
  await supabase.from("calibration_runs").update({ updated_at: new Date().toISOString() }).eq("id", runId);
  revalidatePath(`/calibration/${runId}`);
  return { ok: true, data: { testIdx: last.idx + 1, reasoning: plan.reasoning } };
}

/** Promote a chosen square to a recipe, stamping provenance and marking the run promoted. */
export async function promoteRun(runId: string, testId: string, row: number, col: number): Promise<Result<{ recipeId: string }>> {
  const supabase = await createClient();
  const { data: run } = await supabase.from("calibration_runs").select("*").eq("id", runId).single();
  if (!run) return { ok: false, error: "Run not found." };
  const { data: test } = await supabase.from("calibration_tests").select("axes, statics").eq("id", testId).single();
  if (!test) return { ok: false, error: "Test not found." };
  const { count: testCount } = await supabase.from("calibration_tests").select("id", { count: "exact", head: true }).eq("run_id", runId);

  const axes = test.axes as unknown as TestAxes;
  const statics = (test.statics as Record<string, number>) ?? {};
  const params = resolveCell(axes, statics, row, col);
  const goal = goalMeta(run.goal);

  const { data: recipe, error: recErr } = await supabase
    .from("recipes")
    .insert({
      material_id: run.material_id,
      material_name: run.material_name,
      name: goal.label,
      process: goal.process,
      machine_id: run.machine_id,
      params,
      status: "cal",
      cal_run_id: runId,
      cal_tests: testCount ?? 1,
    })
    .select("id")
    .single();
  if (recErr || !recipe) return { ok: false, error: "Could not create the recipe." };

  await supabase.from("calibration_runs").update({ status: "promoted", promoted_recipe_id: recipe.id, updated_at: new Date().toISOString() }).eq("id", runId);
  revalidatePath("/calibration");
  revalidatePath(`/calibration/${runId}`);
  revalidatePath("/recipes");
  return { ok: true, data: { recipeId: recipe.id } };
}

export async function deleteRun(runId: string): Promise<Result> {
  const supabase = await createClient();
  // Clean up burned-sheet photos first so Storage objects don't orphan; the
  // tests themselves cascade-delete with the run via the FK.
  const { data: tests } = await supabase.from("calibration_tests").select("photo_path, photo_thumb_path").eq("run_id", runId);
  const paths = (tests ?? []).flatMap((t) => [t.photo_path, t.photo_thumb_path].filter((p): p is string => !!p));
  if (paths.length) await supabase.storage.from(CALIBRATION_BUCKET).remove(paths);
  const { error } = await supabase.from("calibration_runs").delete().eq("id", runId);
  if (error) return { ok: false, error: "Could not delete the run." };
  revalidatePath("/calibration");
  return { ok: true };
}

export interface SuggestInput {
  machineId: string;
  materialName: string;
  goal: GoalKey;
  context?: string;
}
export interface SuggestOutput {
  params: Record<string, number>;
  rationale: string;
  source: "ai" | "baseline" | "heuristic";
}

/**
 * Suggested starting settings (BUILD_SPEC §5c). Grounds on the user's own
 * baselines/recipes/attempts and hard-clamps to the machine's ranges. Uses the
 * vision/reasoning model when configured; otherwise falls back to a matching
 * manufacturer baseline, then the machine's mid-range — so the feature stays
 * useful before AI credentials are set.
 */
export async function suggestSettings(input: SuggestInput): Promise<Result<SuggestOutput>> {
  const supabase = await createClient();
  const machine = await getMachine(supabase, input.machineId);
  if (!machine) return { ok: false, error: "Pick a machine first." };
  const goal = goalMeta(input.goal);

  if (await isAiConfigured()) {
    const grounding = await getGrounding(machine.type, input.machineId, input.materialName, goal.process);
    const { system, user } = buildSuggestPrompt(machine.type, machine.ranges, input.materialName, input.goal, grounding, machineContext(machine), input.context ?? "");
    // Short timeout: this is a tiny text prompt, and there's a deterministic
    // fallback below (baseline / mid-range), so don't make the user wait on a
    // slow or unreachable model — fall back fast.
    const res = await chat({ system, user, json: true, timeoutMs: 25000 });
    if (res.ok) {
      const parsed = parseSuggestResponse(extractJson(res.content), machine.type, machine.ranges);
      if (parsed) return { ok: true, data: { ...parsed, source: "ai" } };
    }
  }

  // Fallback: best-matching manufacturer baseline …
  let q = supabase.from("machine_baselines").select("params").eq("machine_type", machine.type).eq("process", goal.process).limit(1);
  if (input.materialName.trim()) q = q.ilike("material_name", `%${input.materialName.trim()}%`);
  const { data: baseline } = await q.maybeSingle();
  if (baseline) {
    const params = clampParams(machine.type, machine.ranges, (baseline.params as Record<string, unknown>) ?? {});
    if (Object.keys(params).length) return { ok: true, data: { params, rationale: "From a manufacturer baseline.", source: "baseline" } };
  }

  // … else the machine's mid-range.
  const params = computeStatics(machine.type, machine.ranges, new Set());
  return { ok: true, data: { params, rationale: "Centered on the machine's mid-range (no prior data yet).", source: "heuristic" } };
}
