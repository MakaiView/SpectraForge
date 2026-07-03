import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecipeDetail, type RecipeDetailData } from "@/components/recipes/RecipeDetail";
import { getMachineOptions, getMaterialOptions } from "@/lib/data/options";
import type { ParamValues } from "@/components/params/ParamReadout";
import type { MachineTypeKey } from "@/lib/params/schema";

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: r } = await supabase
    .from("recipes")
    .select("*, machines(name, type), materials(grade, hazard)")
    .eq("id", id)
    .single();
  if (!r) notFound();

  const machine = r.machines as { name: string; type: string } | null;
  const material = r.materials as { grade: string; hazard: string } | null;

  const [machines, materials] = await Promise.all([getMachineOptions(), getMaterialOptions()]);

  const data: RecipeDetailData = {
    id: r.id,
    name: r.name,
    material_id: r.material_id,
    material_name: r.material_name,
    process: r.process,
    machine_id: r.machine_id,
    machineName: machine?.name ?? null,
    machineType: (machine?.type as MachineTypeKey) ?? null,
    materialGrade: material?.grade ?? "",
    materialHazard: material?.hazard ?? null,
    thickness: r.thickness,
    params: (r.params as ParamValues) ?? {},
    status: r.status,
    attempts: r.attempts,
    notes: r.notes,
    verified_by: r.verified_by,
    last_verified: r.last_verified,
    favorite: r.favorite,
    calRunId: r.cal_run_id,
    calTests: r.cal_tests,
  };

  return <RecipeDetail recipe={data} machines={machines} materials={materials} />;
}
