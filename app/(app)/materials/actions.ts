"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export interface MaterialInput {
  id?: string;
  name: string;
  category_id: string | null;
  thickness: string;
  hazard: "low" | "medium" | "high";
  grade: string;
  safe_power: string;
  notes: string;
  safety: string;
}

export async function saveMaterial(input: MaterialInput): Promise<ActionResult> {
  if (!input.name?.trim()) return { ok: false, error: "Material name is required." };
  const supabase = await createClient();
  const row = {
    name: input.name.trim(),
    category_id: input.category_id,
    thickness: input.thickness.trim(),
    hazard: input.hazard,
    grade: input.grade.trim(),
    safe_power: input.safe_power.trim(),
    notes: input.notes.trim(),
    safety: input.safety.trim(),
  };

  if (input.id) {
    const { error } = await supabase.from("materials").update(row).eq("id", input.id);
    if (error) return { ok: false, error: "Could not save the material." };
    revalidatePath("/materials");
    revalidatePath(`/materials/${input.id}`);
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase.from("materials").insert(row).select("id").single();
  if (error) return { ok: false, error: "Could not create the material." };
  revalidatePath("/materials");
  return { ok: true, id: data.id };
}

export async function deleteMaterial(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("materials").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the material." };
  revalidatePath("/materials");
  return { ok: true };
}

// ── Managed material categories (feeds the material category dropdown) ────────
export async function addCategory(name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Category name is required." };
  const supabase = await createClient();
  // Position after the current max.
  const { data: last } = await supabase.from("material_categories").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  const position = (last?.position ?? 0) + 1;
  const { error } = await supabase.from("material_categories").insert({ name: trimmed, position });
  if (error) {
    const dup = /duplicate|unique/i.test(error.message);
    return { ok: false, error: dup ? "That category already exists." : "Could not add the category." };
  }
  revalidatePath("/materials");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  // Materials referencing it get category_id set to null (FK on delete set null).
  const { error } = await supabase.from("material_categories").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not remove the category." };
  revalidatePath("/materials");
  return { ok: true };
}
