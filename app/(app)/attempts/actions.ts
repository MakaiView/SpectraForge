"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/ai/config";
import { chat, extractJson } from "@/lib/ai/provider";
import { getGrounding } from "@/lib/ai/grounding";
import { machineContext, type MachineInfo } from "@/lib/ai/context";
import { buildAdvisePrompt, parseAdviceResponse, type Advice } from "@/lib/ai/advise";
import { type ResultGrade } from "@/lib/calibration/grades";
import { objectToModelBase64 } from "@/lib/images/forModel";
import { ATTEMPT_BUCKET } from "@/lib/storage/photos";
import type { MachineTypeKey } from "@/lib/params/schema";
import type { Json } from "@/types/db";
import type { ParamValues } from "@/components/params/ParamReadout";

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };
export type ActionResult = { ok: true } | { ok: false; error: string };
export type AdviceResult = { ok: true; advice: Advice } | { ok: false; error: string; unconfigured?: boolean };

export interface AttemptInput {
  id?: string;
  material_id: string | null;
  material_name: string;
  process: "cut" | "engrave" | "mark";
  machine_id: string | null;
  outcome: ResultGrade;
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

/**
 * Generate AI advice for a logged attempt (BUILD_SPEC §5): feed the model the
 * design + burn photos and the full run context (machine, material, process,
 * settings used, outcome, note) grounded in the user's own data, and cache the
 * structured result on the attempt so it isn't re-billed on every view. Gated on
 * AI being configured — there's no useful heuristic for open-ended advice.
 */
export async function adviseAttempt(id: string): Promise<AdviceResult> {
  const supabase = await createClient();

  if (!(await isAiConfigured())) {
    return { ok: false, error: "Set up the AI assistant in Settings to get advice.", unconfigured: true };
  }

  const { data: a } = await supabase
    .from("attempts")
    .select("id, material_name, process, outcome, params, note, input_path, result_path, machines(name, manufacturer, model, type, watts, lens)")
    .eq("id", id)
    .single();
  if (!a) return { ok: false, error: "Attempt not found." };

  const machine = a.machines as MachineInfo | null;
  if (!machine) return { ok: false, error: "Link a machine to this attempt first — advice needs the laser's parameters." };
  const type = machine.type as MachineTypeKey;
  const process = a.process as "cut" | "engrave" | "mark";
  const params = (a.params as Record<string, number>) ?? {};

  // Attach whatever photos exist (base64, server-side — buckets stay private).
  const images: string[] = [];
  if (a.input_path) { const b = await objectToModelBase64(ATTEMPT_BUCKET, a.input_path); if (b) images.push(b); }
  if (a.result_path) { const b = await objectToModelBase64(ATTEMPT_BUCKET, a.result_path); if (b) images.push(b); }

  const grounding = await getGrounding(type, null, a.material_name, process);
  const { system, user } = buildAdvisePrompt(
    {
      machineDesc: machineContext(machine),
      type,
      material: a.material_name,
      process,
      outcome: a.outcome as ResultGrade,
      params,
      note: a.note ?? "",
      hasInput: !!a.input_path,
      hasResult: !!a.result_path,
    },
    grounding,
  );

  const res = await chat({ system, user, images: images.length ? images : undefined, json: true, timeoutMs: 90000 });
  if (!res.ok) return { ok: false, error: res.error };
  const parsed = parseAdviceResponse(extractJson(res.content));
  if (!parsed) return { ok: false, error: "The model's reply couldn't be read. Try again." };

  const advice: Advice = { ...parsed, at: new Date().toISOString() };
  await supabase.from("attempts").update({ ai_advice: advice as unknown as Json }).eq("id", id);
  revalidatePath("/attempts");
  return { ok: true, advice };
}

export async function deleteAttempt(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  // Storage objects are orphaned but harmless; a periodic sweep can reclaim them.
  const { error } = await supabase.from("attempts").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the attempt." };
  revalidatePath("/attempts");
  return { ok: true };
}
