import { createClient } from "@/lib/supabase/server";
import type { MachineOption, MaterialOption } from "@/components/recipes/RecipeForm";
import type { MachineTypeKey } from "@/lib/params/schema";

/** Machines as recipe-form options (id, name, type, ranges). Owner-scoped by RLS. */
export async function getMachineOptions(): Promise<MachineOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("machines").select("id, name, type, ranges, addons").order("created_at", { ascending: true });
  return (data ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    type: m.type as MachineTypeKey,
    ranges: (m.ranges as MachineOption["ranges"]) ?? {},
    addons: m.addons ?? [],
  }));
}

/** Materials as recipe-form options (id, name). Owner-scoped by RLS. */
export async function getMaterialOptions(): Promise<MaterialOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("materials").select("id, name").order("name", { ascending: true });
  return (data ?? []) as MaterialOption[];
}
