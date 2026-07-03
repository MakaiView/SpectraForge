import { createClient } from "@/lib/supabase/server";
import { MachinesScreen, type MachineListItem } from "@/components/machines/MachinesScreen";
import type { MachineTypeKey } from "@/lib/params/schema";

export const metadata = { title: "Machines · SpectraForge" };

export default async function MachinesPage() {
  const supabase = await createClient();
  // Embedded count of related recipes per machine (RLS scopes to the owner).
  const { data } = await supabase
    .from("machines")
    .select("*, recipes(count)")
    .order("created_at", { ascending: true });

  const machines: MachineListItem[] = (data ?? []).map((m) => ({
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
    ranges: (m.ranges as MachineListItem["ranges"]) ?? {},
    recipeCount: Array.isArray(m.recipes) && m.recipes[0] ? (m.recipes[0] as { count: number }).count : 0,
  }));

  return <MachinesScreen machines={machines} />;
}
