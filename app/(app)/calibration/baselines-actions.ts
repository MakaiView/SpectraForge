"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json, TablesInsert } from "@/types/db";
import { PARAM_DEFS, type MachineTypeKey } from "@/lib/params/schema";

export type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const TYPES = new Set(["co2", "fiber", "diode", "uv", "ir"]);
const PROCS = new Set(["cut", "engrave", "mark"]);

export interface BaselineInput {
  id?: string;
  machine_id: string | null;
  machine_type: MachineTypeKey;
  lens: string;
  material_name: string;
  process: "cut" | "engrave" | "mark";
  params: Record<string, number>;
  source: string;
  notes: string;
}

export async function saveBaseline(input: BaselineInput): Promise<Result> {
  if (!TYPES.has(input.machine_type)) return { ok: false, error: "Pick a machine type." };
  if (!input.material_name.trim()) return { ok: false, error: "Material is required." };
  const supabase = await createClient();
  const row = {
    machine_id: input.machine_id,
    machine_type: input.machine_type,
    lens: input.lens.trim(),
    material_name: input.material_name.trim(),
    process: input.process,
    params: input.params as unknown as Json,
    source: input.source.trim() || "manufacturer",
    notes: input.notes.trim(),
  };
  if (input.id) {
    const { error } = await supabase.from("machine_baselines").update(row).eq("id", input.id);
    if (error) return { ok: false, error: "Could not save the baseline." };
  } else {
    const { error } = await supabase.from("machine_baselines").insert(row);
    if (error) return { ok: false, error: "Could not create the baseline." };
  }
  revalidatePath("/calibration");
  return { ok: true };
}

export async function deleteBaseline(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("machine_baselines").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete the baseline." };
  revalidatePath("/calibration");
  return { ok: true };
}

/** Parse one paste line: `material | process | key=val, key=val`. */
function parseLine(line: string): { material: string; process: string; params: Record<string, number> } | null {
  const parts = line.split("|").map((s) => s.trim());
  if (parts.length < 3) return null;
  const [material, process, paramStr] = parts;
  if (!material || !PROCS.has(process)) return null;
  const params: Record<string, number> = {};
  for (const pair of paramStr.split(",")) {
    const [k, v] = pair.split("=").map((s) => s.trim());
    if (k in PARAM_DEFS && v !== undefined && v !== "" && !Number.isNaN(Number(v))) params[k] = Number(v);
  }
  return Object.keys(params).length ? { material, process, params } : null;
}

export interface ImportInput {
  machine_id: string | null;
  machine_type: MachineTypeKey;
  lens: string;
  source: string;
  text: string;
}

/**
 * Bulk-import baselines from pasted lines (BUILD_SPEC §6 import path). One
 * baseline per line: `material | process | key=val, key=val`. Numbers are
 * owner-supplied (from the manufacturer PDFs) — never invented here.
 */
export async function importBaselines(input: ImportInput): Promise<Result<{ imported: number; skipped: number }>> {
  if (!TYPES.has(input.machine_type)) return { ok: false, error: "Pick a machine type." };
  const lines = input.text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { ok: false, error: "Paste at least one line." };

  const rows: TablesInsert<"machine_baselines">[] = [];
  let skipped = 0;
  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) { skipped++; continue; }
    rows.push({
      machine_id: input.machine_id,
      machine_type: input.machine_type,
      lens: input.lens.trim(),
      material_name: parsed.material,
      process: parsed.process as "cut" | "engrave" | "mark",
      params: parsed.params as unknown as Json,
      source: input.source.trim() || "manufacturer",
    });
  }
  if (rows.length === 0) return { ok: false, error: "No valid lines. Format: material | process | key=val, key=val" };

  const supabase = await createClient();
  const { error } = await supabase.from("machine_baselines").insert(rows);
  if (error) return { ok: false, error: "Import failed." };
  revalidatePath("/calibration");
  return { ok: true, data: { imported: rows.length, skipped } };
}
