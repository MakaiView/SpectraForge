import { createClient } from "@/lib/supabase/server";
import { RecipesScreen, type RecipeListItem } from "@/components/recipes/RecipesScreen";
import { getMachineOptions, getMaterialOptions } from "@/lib/data/options";
import type { ParamValues } from "@/components/params/ParamReadout";
import type { MachineTypeKey } from "@/lib/params/schema";

export const metadata = { title: "Recipes · SpectraForge" };

export default async function RecipesPage() {
  const supabase = await createClient();
  const [{ data }, machines, materials] = await Promise.all([
    supabase.from("recipes").select("*, machines(name, type)").order("created_at", { ascending: false }),
    getMachineOptions(),
    getMaterialOptions(),
  ]);

  const recipes: RecipeListItem[] = (data ?? []).map((r) => {
    const machine = r.machines as { name: string; type: string } | null;
    return {
      id: r.id,
      name: r.name,
      material_name: r.material_name,
      process: r.process,
      machineName: machine?.name ?? null,
      machineType: (machine?.type as MachineTypeKey) ?? null,
      thickness: r.thickness,
      params: (r.params as ParamValues) ?? {},
      status: r.status,
      attempts: r.attempts,
      favorite: r.favorite,
    };
  });

  return <RecipesScreen recipes={recipes} machines={machines} materials={materials} defaultMachineId={machines[0]?.id ?? null} />;
}
