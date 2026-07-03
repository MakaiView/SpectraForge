import { createClient } from "@/lib/supabase/server";
import { CalibrationScreen, type RunListItem } from "@/components/calibration/CalibrationScreen";
import type { BaselineItem } from "@/components/baselines/BaselineManager";
import { getMachineOptions, getMaterialOptions } from "@/lib/data/options";
import type { MachineTypeKey } from "@/lib/params/schema";

export const metadata = { title: "Calibration Lab · SpectraForge" };

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function CalibrationPage() {
  const supabase = await createClient();
  const [{ data }, machines, materials, { data: baseRows }] = await Promise.all([
    supabase.from("calibration_runs").select("*, machines(name, type), calibration_tests(count)").order("updated_at", { ascending: false }),
    getMachineOptions(),
    getMaterialOptions(),
    supabase.from("machine_baselines").select("*").order("created_at", { ascending: false }),
  ]);

  const baselines: BaselineItem[] = (baseRows ?? []).map((b) => ({
    id: b.id,
    machineType: b.machine_type as MachineTypeKey,
    lens: b.lens,
    materialName: b.material_name,
    process: b.process,
    params: (b.params as Record<string, number>) ?? {},
    source: b.source,
  }));

  const runs: RunListItem[] = (data ?? []).map((r) => {
    const machine = r.machines as { name: string; type: string } | null;
    return {
      id: r.id,
      name: r.name,
      materialName: r.material_name,
      goal: r.goal,
      machineName: machine?.name ?? null,
      machineType: (machine?.type as MachineTypeKey) ?? null,
      testCount: Array.isArray(r.calibration_tests) && r.calibration_tests[0] ? (r.calibration_tests[0] as { count: number }).count : 0,
      status: r.status,
      dateLabel: dateLabel(r.updated_at),
    };
  });

  return <CalibrationScreen runs={runs} machines={machines} materials={materials} baselines={baselines} />;
}
