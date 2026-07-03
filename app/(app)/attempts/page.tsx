import { createClient } from "@/lib/supabase/server";
import { AttemptsScreen, type AttemptItem } from "@/components/attempts/AttemptsScreen";
import { getMachineOptions, getMaterialOptions } from "@/lib/data/options";
import { ATTEMPT_BUCKET, signedUrlMap } from "@/lib/storage/photos";
import type { ParamValues } from "@/components/params/ParamReadout";
import type { MachineTypeKey } from "@/lib/params/schema";

export const metadata = { title: "Attempts · SpectraForge" };

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function AttemptsPage() {
  const supabase = await createClient();
  const [{ data }, machines, materials] = await Promise.all([
    supabase.from("attempts").select("*, machines(name, type)").order("logged_at", { ascending: false }),
    getMachineOptions(),
    getMaterialOptions(),
  ]);

  const rows = data ?? [];

  // Batch-sign every photo path across all attempts in one round-trip.
  const paths = rows.flatMap((r) => [r.input_thumb_path, r.input_path, r.result_thumb_path, r.result_path].filter((p): p is string => !!p));
  const urls = await signedUrlMap(ATTEMPT_BUCKET, paths);

  const attempts: AttemptItem[] = rows.map((r) => {
    const machine = r.machines as { name: string; type: string } | null;
    return {
      id: r.id,
      dateLabel: dateLabel(r.logged_at),
      material_id: r.material_id,
      material_name: r.material_name,
      process: r.process,
      machine_id: r.machine_id,
      machineName: machine?.name ?? null,
      machineType: (machine?.type as MachineTypeKey) ?? null,
      outcome: r.outcome,
      params: (r.params as ParamValues) ?? {},
      addons: r.addons ?? [],
      note: r.note,
      inputThumbUrl: r.input_thumb_path ? urls[r.input_thumb_path] ?? null : null,
      inputFullUrl: r.input_path ? urls[r.input_path] ?? null : null,
      resultThumbUrl: r.result_thumb_path ? urls[r.result_thumb_path] ?? null : null,
      resultFullUrl: r.result_path ? urls[r.result_path] ?? null : null,
    };
  });

  return <AttemptsScreen attempts={attempts} machines={machines} materials={materials} />;
}
