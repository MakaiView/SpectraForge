import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MaterialDetail } from "@/components/materials/MaterialDetail";
import type { MaterialFormValue, Category } from "@/components/materials/MaterialForm";

export default async function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: m } = await supabase
    .from("materials")
    .select("*, material_categories(name)")
    .eq("id", id)
    .single();
  if (!m) notFound();

  const [{ data: recipes }, { data: cats }] = await Promise.all([
    supabase.from("recipes").select("id, name, process, status, machine_id").eq("material_id", id).order("created_at", { ascending: false }),
    supabase.from("material_categories").select("id, name").order("position", { ascending: true }),
  ]);

  const material: MaterialFormValue = {
    id: m.id,
    name: m.name,
    category_id: m.category_id,
    thickness: m.thickness,
    hazard: m.hazard,
    grade: m.grade,
    safe_power: m.safe_power,
    notes: m.notes,
    safety: m.safety,
  };

  return (
    <MaterialDetail
      material={material}
      categoryName={(m.material_categories as { name: string } | null)?.name ?? null}
      categories={(cats ?? []) as Category[]}
      recipes={(recipes ?? []).map((r) => ({ id: r.id, name: r.name, process: r.process, status: r.status }))}
    />
  );
}
