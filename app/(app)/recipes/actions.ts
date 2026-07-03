"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ParamValues } from "@/components/params/ParamReadout";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export interface RecipeInput {
  id?: string;
  name: string;
  material_id: string | null;
  material_name: string;
  process: "cut" | "engrave" | "mark";
  machine_id: string | null;
  thickness: string;
  params: ParamValues;
  status: "draft" | "cal" | "review" | "fail";
  notes: string;
  verified_by: string;
}

export async function saveRecipe(input: RecipeInput): Promise<ActionResult> {
  if (!input.name?.trim()) return { ok: false, error: "Recipe name is required." };
  const supabase = await createClient();

  // Drop null/undefined params so the jsonb stays clean.
  const params: Record<string, number> = {};
  for (const [k, v] of Object.entries(input.params)) {
    if (v !== null && v !== undefined && !Number.isNaN(v)) params[k] = v as number;
  }

  const row = {
    name: input.name.trim(),
    material_id: input.material_id,
    material_name: input.material_name.trim(),
    process: input.process,
    machine_id: input.machine_id,
    thickness: input.thickness.trim(),
    params,
    status: input.status,
    notes: input.notes.trim(),
    verified_by: input.verified_by.trim(),
  };

  if (input.id) {
    const { error } = await supabase.from("recipes").update(row).eq("id", input.id);
    if (error) return { ok: false, error: "Could not save the recipe." };
    revalidatePath("/recipes");
    revalidatePath(`/recipes/${input.id}`);
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase.from("recipes").insert(row).select("id").single();
  if (error) return { ok: false, error: "Could not create the recipe." };
  revalidatePath("/recipes");
  return { ok: true, id: data.id };
}

export async function deleteRecipe(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the recipe." };
  revalidatePath("/recipes");
  return { ok: true };
}

export async function toggleFavorite(id: string, favorite: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("recipes").update({ favorite }).eq("id", id);
  if (error) return { ok: false, error: "Could not update the recipe." };
  revalidatePath("/recipes");
  revalidatePath("/favorites");
  return { ok: true };
}
