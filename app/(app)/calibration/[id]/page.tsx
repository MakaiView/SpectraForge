import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RunWizard, type WizardRun, type WizardTest } from "@/components/calibration/RunWizard";
import { CALIBRATION_BUCKET, signedUrlMap } from "@/lib/storage/photos";
import type { MachineTypeKey } from "@/lib/params/schema";
import type { TestAxes, Grid, BestSquare } from "@/lib/calibration/engine";
import type { Ranges } from "@/lib/calibration/engine";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: run } = await supabase.from("calibration_runs").select("*, machines(name, type, ranges)").eq("id", id).single();
  if (!run) notFound();

  const { data: testRows } = await supabase.from("calibration_tests").select("*").eq("run_id", id).order("idx", { ascending: true });
  const rows = testRows ?? [];

  const paths = rows.flatMap((t) => [t.photo_thumb_path, t.photo_path].filter((p): p is string => !!p));
  const urls = await signedUrlMap(CALIBRATION_BUCKET, paths);

  const machine = run.machines as { name: string; type: string; ranges: Ranges } | null;

  const wizardRun: WizardRun = {
    id: run.id,
    materialName: run.material_name,
    goal: run.goal,
    machineName: machine?.name ?? null,
    machineType: (machine?.type as MachineTypeKey) ?? null,
    machineRanges: machine?.ranges ?? {},
    status: run.status,
    promotedRecipeId: run.promoted_recipe_id,
  };

  const tests: WizardTest[] = rows.map((t) => ({
    id: t.id,
    idx: t.idx,
    pattern: t.pattern,
    axes: t.axes as unknown as TestAxes,
    statics: (t.statics as Record<string, number>) ?? {},
    grid: (t.grid as unknown as Grid) ?? {},
    best: (t.best_square as unknown as BestSquare) ?? null,
    analysis: (t.analysis as { headline: string; writeup: string } | null) ?? null,
    sheetThumbUrl: t.photo_thumb_path ? urls[t.photo_thumb_path] ?? null : null,
    sheetFullUrl: t.photo_path ? urls[t.photo_path] ?? null : null,
  }));

  return <RunWizard run={wizardRun} tests={tests} />;
}
