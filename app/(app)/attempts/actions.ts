"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ParamValues } from "@/components/params/ParamReadout";

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

export interface AttemptInput {
  id?: string;
  material_id: string | null;
  material_name: string;
  process: "cut" | "engrave" | "mark";
  machine_id: string | null;
  outcome: "clean" | "marginal" | "fail";
  params: ParamValues;
  addons: string[];
  note: string;
}

/** Insert or update an attempt's fields. Photos are attached separately via
 *  /api/attempts/[id]/photo. Returns the id so the client can then upload. */
export async function saveAttempt(input: AttemptInput): Promise<SaveResult> {
  const supabase = await createClient();

  const params: Record<string, number> = {};
  for (const [k, v] of Object.entries(input.params)) {
    if (v !== null && v !== undefined && !Number.isNaN(v)) params[k] = v as number;
  }

  const row = {
    material_id: input.material_id,
    material_name: input.material_name.trim(),
    process: input.process,
    machine_id: input.machine_id,
    outcome: input.outcome,
    params,
    addons: input.addons,
    note: input.note.trim(),
  };

  if (input.id) {
    const { error } = await supabase.from("attempts").update(row).eq("id", input.id);
    if (error) return { ok: false, error: "Could not save the attempt." };
    revalidatePath("/attempts");
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase.from("attempts").insert(row).select("id").single();
  if (error) return { ok: false, error: "Could not create the attempt." };
  revalidatePath("/attempts");
  return { ok: true, id: data.id };
}

export async function deleteAttempt(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  // Storage objects are orphaned but harmless; a periodic sweep can reclaim them.
  const { error } = await supabase.from("attempts").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the attempt." };
  revalidatePath("/attempts");
  return { ok: true };
}
