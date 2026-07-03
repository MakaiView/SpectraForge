import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MachineDetail } from "@/components/machines/MachineDetail";
import type { MachineFormValue } from "@/components/machines/MachineForm";
import type { MachineTypeKey } from "@/lib/params/schema";

export default async function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: m } = await supabase.from("machines").select("*").eq("id", id).single();
  if (!m) notFound();

  const { count } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .eq("machine_id", id);

  const machine: MachineFormValue = {
    id: m.id,
    name: m.name,
    manufacturer: m.manufacturer,
    model: m.model,
    type: m.type as MachineTypeKey,
    watts: m.watts,
    bed_w: m.bed_w,
    bed_h: m.bed_h,
    lens: m.lens,
    addons: m.addons ?? [],
    ranges: (m.ranges as MachineFormValue["ranges"]) ?? {},
  };

  return <MachineDetail machine={machine} recipeCount={count ?? 0} />;
}
