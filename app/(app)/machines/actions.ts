"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MachineTypeKey } from "@/lib/params/schema";

export interface MachineInput {
  id?: string;
  name: string;
  manufacturer: string;
  model: string;
  type: MachineTypeKey;
  watts: number;
  bed_w: number;
  bed_h: number;
  lens: string;
  addons: string[];
  ranges: Record<string, { min?: number | null; max?: number | null }>;
}

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const TYPES: MachineTypeKey[] = ["co2", "fiber", "diode", "uv", "ir"];

function validate(input: MachineInput): string | null {
  if (!input.name?.trim()) return "Machine name is required.";
  if (!TYPES.includes(input.type)) return "Pick a laser type.";
  return null;
}

/** Insert or update a machine. RLS scopes the row to the caller (owner_id default auth.uid()). */
export async function saveMachine(input: MachineInput): Promise<ActionResult> {
  const err = validate(input);
  if (err) return { ok: false, error: err };

  const supabase = await createClient();
  const row = {
    name: input.name.trim(),
    manufacturer: input.manufacturer.trim(),
    model: input.model.trim(),
    type: input.type,
    watts: Math.round(input.watts) || 0,
    bed_w: Math.round(input.bed_w) || 0,
    bed_h: Math.round(input.bed_h) || 0,
    lens: input.lens.trim(),
    addons: input.addons,
    ranges: input.ranges,
  };

  if (input.id) {
    const { error } = await supabase.from("machines").update(row).eq("id", input.id);
    if (error) return { ok: false, error: "Could not save the machine." };
    revalidatePath("/machines");
    revalidatePath(`/machines/${input.id}`);
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase.from("machines").insert(row).select("id").single();
  if (error) return { ok: false, error: "Could not create the machine." };
  revalidatePath("/machines");
  return { ok: true, id: data.id };
}

export async function deleteMachine(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("machines").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the machine." };
  revalidatePath("/machines");
  return { ok: true };
}
