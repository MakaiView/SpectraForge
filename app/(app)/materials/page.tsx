import { createClient } from "@/lib/supabase/server";
import { MaterialsScreen, type MaterialListItem } from "@/components/materials/MaterialsScreen";
import type { Category } from "@/components/materials/MaterialForm";

export const metadata = { title: "Materials · SpectraForge" };

export default async function MaterialsPage() {
  const supabase = await createClient();

  const [{ data: mats }, { data: cats }] = await Promise.all([
    supabase
      .from("materials")
      .select("*, material_categories(name), recipes(count)")
      .order("created_at", { ascending: true }),
    supabase.from("material_categories").select("id, name").order("position", { ascending: true }),
  ]);

  const materials: MaterialListItem[] = (mats ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    categoryName: (m.material_categories as { name: string } | null)?.name ?? null,
    category_id: m.category_id,
    thickness: m.thickness,
    hazard: m.hazard,
    grade: m.grade,
    safe_power: m.safe_power,
    notes: m.notes,
    safety: m.safety,
    recipeCount: Array.isArray(m.recipes) && m.recipes[0] ? (m.recipes[0] as { count: number }).count : 0,
  }));

  const categories: Category[] = (cats ?? []) as Category[];

  return <MaterialsScreen materials={materials} categories={categories} />;
}
